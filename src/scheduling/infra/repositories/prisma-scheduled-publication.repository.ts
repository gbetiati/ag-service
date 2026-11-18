import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  SCHEDULED_CONTENT_PILLAR,
  ScheduledContentContext,
  ScheduledContentDraft,
} from '../../../content-strategy/domain/scheduled-content-ai.interface.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  PREPARATION_LEAD_MS,
  ScheduleJob,
  ScheduleKey,
  ScheduledPublicationRepository,
  ScheduledRun,
  ScheduleStage,
  contentRevision,
  scheduledVideoPassed,
} from '../../domain/scheduled-publication.repository.js';

const include = {
  publication: { include: { socialAccount: true, company: true } },
  content: true,
  generation: {
    include: {
      videoAsset: { include: { validations: { include: { results: true } } } },
    },
  },
} satisfies Prisma.ScheduledPublicationInclude;

type RunRecord = Prisma.ScheduledPublicationGetPayload<{
  include: typeof include;
}>;
const terminalStages: ScheduleStage[] = [
  'PUBLISHED',
  'FAILED',
  'RECONCILIATION_REQUIRED',
];

@Injectable()
export class PrismaScheduledPublicationRepository extends ScheduledPublicationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async schedule(input: {
    publicationId: string;
    companyId: string;
    scheduledFor: Date;
  }): Promise<ScheduledRun> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const { publicationId, companyId, scheduledFor } = input;
          const scope = { id: publicationId, companyId };
          const publication = await tx.publication.findFirst({
            where: {
              ...scope,
              content: { companyId },
              socialAccount: { companyId },
            },
            include: { preparation: true, content: true },
          });
          if (!publication) {
            throw new NotFoundException(
              'Publication not found for this company.',
            );
          }
          if (
            publication.preparation &&
            publication.scheduledFor?.getTime() === scheduledFor.getTime() &&
            publication.preparation.stage !== 'FAILED'
          ) {
            const record = await tx.scheduledPublication.findUniqueOrThrow({
              where: { id: publication.preparation.id },
              include,
            });
            return this.toRun(tx, record);
          }
          if (
            ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(
              publication.content.status,
            )
          ) {
            throw new ConflictException(
              'The content is published, archived or rejected.',
            );
          }

          if (publication.status === 'PUBLISHED' || publication.status === 'REJECTED') {
            throw new ConflictException(
              `Publication cannot be rescheduled because its status is ${publication.status}.`,
            );
          }

          const current = publication.preparation;
          if (current) {
            // Lock the preparation before the publication, the same order used by stage transitions.
            const invalidated = await tx.scheduledPublication.updateMany({
              where: {
                id: current.id,
                companyId,
                stage: {
                  notIn: ['PUBLISHING', 'PUBLISHED', 'RECONCILIATION_REQUIRED'],
                },
              },
              data: { nextRunAt: null, leaseUntil: null },
            });
            if (!invalidated.count)
              throw new ConflictException(
                'The existing publication must be reconciled before rescheduling.',
              );
          }
          const updated = await tx.publication.updateMany({
            where: { ...scope, status: { notIn: ['PUBLISHED', 'REJECTED'] } },
            data: { status: 'SCHEDULED', scheduledFor, errorMessage: null },
          });
          if (!updated.count)
            throw new ConflictException(
              'Publication cannot be rescheduled in its current state.',
            );
          const data = {
            id: crypto.randomUUID(),
            companyId,
            contentId: publication.contentId,
            stage: 'PREPARE' as const,
            nextRunAt: new Date(scheduledFor.getTime() - PREPARATION_LEAD_MS),
          };
          const record = await tx.scheduledPublication.upsert({
            where: { publicationId },
            create: { ...data, publicationId },
            update: {
              ...data,
              leaseUntil: null,
              contentIdeaId: null,
              generationId: null,
              revision: null,
              approvedAt: null,
              attempts: 0,
              errorMessage: null,
              createdAt: new Date(),
            },
            include,
          });
          return this.toRun(tx, record);
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException(
          'A concurrent change or another active schedule exists for this content.',
        );
      }
      throw error;
    }
  }

  async find(key: ScheduleKey): Promise<ScheduledRun | null> {
    const record = await this.prisma.scheduledPublication.findFirst({
      where: { id: key.id, companyId: key.companyId },
      include,
    });
    return record && this.toRun(this.prisma, record);
  }

  async findByPublication(
    companyId: string,
    publicationId: string,
  ): Promise<ScheduledRun | null> {
    const record = await this.prisma.scheduledPublication.findFirst({
      where: { companyId, publicationId },
      include,
    });
    return record && this.toRun(this.prisma, record);
  }

  async due(now: Date): Promise<ScheduleJob[]> {
    const records = await this.prisma.scheduledPublication.findMany({
      where: {
        nextRunAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      orderBy: { nextRunAt: 'asc' },
      take: 100,
      select: { id: true, companyId: true, nextRunAt: true, stage: true },
    });
    return records.flatMap(({ id, companyId, nextRunAt, stage }) =>
      nextRunAt ? [{ id, companyId, dueAt: nextRunAt.getTime(), stage }] : [],
    );
  }

  async claim(job: ScheduleJob, now: Date): Promise<ScheduledRun | null> {
    if (job.dueAt > now.getTime()) return null;
    const { id, companyId } = job;
    const result = await this.prisma.scheduledPublication.updateMany({
      where: {
        id,
        companyId,
        stage: job.stage,
        nextRunAt: new Date(job.dueAt),
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      data: {
        leaseUntil: new Date(now.getTime() + 90_000),
        attempts: { increment: 1 },
      },
    });
    return result.count ? this.find({ id, companyId }) : null;
  }

  async context(run: ScheduledRun): Promise<{ instructions: ScheduledContentContext; revision: string; } | null> {
    const content = await this.prisma.content.findFirst({
      where: { id: run.contentId, companyId: run.companyId },
      include: {
        assets: { select: { mediaAssetId: true } },
        brand: {
          include: {
            rules: {
              where: { companyId: run.companyId },
              orderBy: { isRequired: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!content || (content.brand && content.brand.companyId !== run.companyId)) return null;

    const [products, history, themeImage] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          companyId: run.companyId,
          status: 'ACTIVE',
          ...(content.brandId ? { brandId: content.brandId } : {}),
          mediaAssets: {
            some: {
              companyId: run.companyId,
              kind: 'IMAGE',
              mimeType: { startsWith: 'image/' },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: { id: true, name: true, description: true, priceCents: true },
      }),
      this.prisma.content.findMany({
        where: {
          companyId: run.companyId,
          id: { not: run.contentId },
          ...(content.brandId ? { brandId: content.brandId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: { title: true, script: true },
      }),
      this.prisma.mediaAsset.findFirst({
        where: {
          companyId: run.companyId,
          productId: null,
          kind: 'IMAGE',
          mimeType: { startsWith: 'image/' },
          id: {
            in: content.assets.flatMap(({ mediaAssetId }) =>
              mediaAssetId ? [mediaAssetId] : [],
            ),
          },
        },
        select: { id: true },
      }),
    ]);
    return {
      revision: contentRevision(content),
      instructions: {
        content: { title: content.title, brief: content.brief },
        brand: content.brand
          ? {
            name: content.brand.name,
            rules: content.brand.rules.map((rule) => rule.ruleText),
          }
          : null,
        products,
        themeAvailable: !!themeImage || (products.length === 0 && hasBrownieImageFallback(content)),
        history: history.map(({ title, script }) => ({
          title,
          script: script?.slice(0, 2_000) ?? null,
        })),
      },
    };
  }

  async prepare(run: ScheduledRun, draft: ScheduledContentDraft, expectedRevision: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const moved = await tx.scheduledPublication.updateMany({
        where: this.claimed(run),
        data: {
          stage: 'RENDER',
          attempts: 0,
          leaseUntil: null,
          errorMessage: null,
          nextRunAt: new Date(),
        },
      });
      if (!moved.count) return false;
      const content = await tx.content.findFirstOrThrow({
        where: { id: run.contentId, companyId: run.companyId },
        include: { assets: { select: { mediaAssetId: true } } },
      });
      if (contentRevision(content) !== expectedRevision) {
        throw new ConflictException(
          'Content changed during editorial generation. Reschedule to prepare the new revision.',
        );
      }
      if (['REJECTED', 'PUBLISHED', 'ARCHIVED'].includes(content.status)) {
        throw new ConflictException(
          'The content is no longer eligible for preparation.',
        );
      }
      if (
        draft.productId &&
        !(await tx.product.findFirst({
          where: {
            id: draft.productId,
            companyId: run.companyId,
            ...(content.brandId ? { brandId: content.brandId } : {}),
            status: 'ACTIVE',
          },
          select: { id: true },
        }))
      ) {
        throw new ConflictException(
          'The selected product is no longer eligible.',
        );
      }
      const media = await tx.mediaAsset.findMany({
        where: {
          companyId: run.companyId,
          productId: draft.productId,
          kind: 'IMAGE',
          mimeType: { startsWith: 'image/' },
          ...(draft.productId
            ? {}
            : {
              id: {
                in: content.assets.flatMap((asset) =>
                  asset.mediaAssetId ? [asset.mediaAssetId] : [],
                ),
              },
            }),
        },
        orderBy: { createdAt: 'asc' },
        take: 12,
        select: { id: true },
      });
      const useBrownieImage = !media.length && draft.productId === null && hasBrownieImageFallback(content);
      if (!media.length && !useBrownieImage) {
        throw new ConflictException(
          'The selected product or theme has no eligible image for rendering.',
        );
      }
      const pillar = await tx.contentPillar.upsert({
        where: {
          companyId_name: {
            companyId: run.companyId,
            name: SCHEDULED_CONTENT_PILLAR,
          },
        },
        create: { companyId: run.companyId, name: SCHEDULED_CONTENT_PILLAR },
        update: {},
      });
      const idea = await tx.contentIdea.create({
        data: {
          companyId: run.companyId,
          brandId: content.brandId,
          productId: draft.productId,
          pillarId: pillar.id,
          title: draft.title,
          summary: draft.summary,
        },
      });
      const changed = await tx.content.updateMany({
        where: {
          id: content.id,
          companyId: run.companyId,
          updatedAt: content.updatedAt,
        },
        data: {
          title: draft.title,
          script: draft.script,
          productId: draft.productId,
          status: 'DRAFT',
        },
      });
      if (!changed.count)
        throw new ConflictException('Content changed during preparation.');
      const revision = contentRevision({ ...content, ...draft });
      const generation = await tx.videoGeneration.create({
        data: {
          id: run.id,
          companyId: run.companyId,
          contentId: run.contentId,
          provider: 'CREATOMATE',
          request: {
            sourceMediaAssetIds: media.map((asset) => asset.id),
            outputFormat: 'mp4',
            scheduledRevision: revision,
            ...(useBrownieImage ? { useBrownieImage: true } : {}),
          },
        },
      });
      await tx.contentHistory.create({
        data: {
          contentId: content.id,
          action: 'SCHEDULED_CONTENT_PREPARED',
          previousData: {
            title: content.title,
            script: content.script,
            productId: content.productId,
            status: content.status,
          },
          newData: {
            scheduleId: run.id,
            contentIdeaId: idea.id,
            title: draft.title,
            script: draft.script,
            productId: draft.productId,
          },
        },
      });
      await tx.scheduledPublication.update({
        where: { id: run.id, companyId: run.companyId },
        data: { contentIdeaId: idea.id, generationId: generation.id, revision },
      });
      return true;
    });
  }

  async advance(
    run: ScheduledRun,
    step: {
      stage: ScheduleStage;
      due: Date | null;
      error?: string;
      attempts?: number;
    },
  ): Promise<ScheduledRun | null> {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.scheduledPublication.updateMany({
        where: this.claimed(run),
        data: {
          stage: step.stage,
          nextRunAt: step.due,
          leaseUntil: null,
          errorMessage: step.error ?? null,
          attempts: step.attempts ?? 0,
        },
      });
      if (!changed.count) return null;
      if (step.stage !== 'PUBLISHED') {
        await tx.publication.updateMany({
          where: {
            id: run.publicationId,
            companyId: run.companyId,
            status: { not: 'PUBLISHED' },
          },
          data: {
            errorMessage: step.error ?? null,
            ...(step.stage === 'FAILED' ||
              step.stage === 'RECONCILIATION_REQUIRED'
              ? { status: 'FAILED' }
              : {}),
          },
        });
      }
      if (
        step.stage === 'RECONCILIATION_REQUIRED' &&
        run.stage === 'PUBLISHING'
      ) {
        const attempts = await tx.publicationAttempt.aggregate({
          where: { publicationId: run.publicationId },
          _max: { attemptNumber: true },
        });
        await tx.publicationAttempt.create({
          data: {
            publicationId: run.publicationId,
            status: 'FAILED',
            errorMessage: step.error,
            attemptNumber: (attempts._max.attemptNumber ?? 0) + 1,
          },
        });
      }
      const record = await tx.scheduledPublication.findUniqueOrThrow({
        where: { id: run.id, companyId: run.companyId },
        include,
      });
      return this.toRun(tx, record);
    });
  }

  async approve(input: {
    companyId: string;
    contentId: string;
    scheduleId?: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.scheduledPublication.findFirst({
        where: {
          companyId: input.companyId,
          contentId: input.contentId,
          stage: { notIn: terminalStages },
        },
        include,
      });
      if (!record) {
        if (input.scheduleId)
          throw new ConflictException(
            'The scheduled revision is no longer active.',
          );
        return false;
      }
      const run = await this.toRun(tx, record);
      if (
        run.id !== input.scheduleId ||
        !['APPROVAL', 'PUBLISH'].includes(run.stage) ||
        !run.validTarget ||
        run.rejected ||
        run.approvalMode !== 'MANUAL' ||
        !scheduledVideoPassed(run)
      ) {
        throw new ConflictException(
          'Manual approval requires the current scheduled revision and its approved video.',
        );
      }
      const moved = await tx.scheduledPublication.updateMany({
        where: {
          id: run.id,
          companyId: input.companyId,
          stage: { in: ['APPROVAL', 'PUBLISH'] },
        },
        data: {
          approvedAt: new Date(),
          stage: 'PUBLISH',
          nextRunAt: new Date(Math.max(Date.now(), run.scheduledFor.getTime())),
          leaseUntil: null,
        },
      });
      if (!moved.count)
        throw new ConflictException(
          'The scheduled revision changed before approval.',
        );
      const updated = await tx.content.updateMany({
        where: {
          id: run.contentId,
          companyId: run.companyId,
          updatedAt: record.content.updatedAt,
        },
        data: { status: 'APPROVED' },
      });
      if (!updated.count)
        throw new ConflictException('The content changed before approval.');
      return true;
    });
  }

  private claimed(run: ScheduledRun): Prisma.ScheduledPublicationWhereInput {
    return {
      id: run.id,
      companyId: run.companyId,
      stage: run.stage,
      nextRunAt: run.nextRunAt,
      leaseUntil: run.leaseUntil,
    };
  }

  private async toRun(
    db: Prisma.TransactionClient,
    record: RunRecord,
  ): Promise<ScheduledRun> {
    const { publication, generation, content, companyId } = record;
    const asset = generation?.videoAsset;
    const validation = asset?.validations.find(
      (row) => row.companyId === companyId && row.contentId === content.id,
    );
    const approvedCheck = (name: string) =>
      validation?.results.find(
        (row) =>
          row.checkName === name && row.status === 'APPROVED' && row.passed,
      );
    const realVision =
      evidenceSource(approvedCheck('vision')?.evidence) === 'multimodal';
    const audio = validation?.results.find((row) => row.checkName === 'audio');
    const audioSource = evidenceSource(audio?.evidence);
    const pauses = await db.automationState.findMany({
      where: { companyId, paused: true },
      select: { queueName: true },
    });
    return {
      id: record.id,
      companyId,
      contentId: record.contentId,
      publicationId: record.publicationId,
      socialAccountId: publication.socialAccountId,
      scheduledFor: publication.scheduledFor ?? record.createdAt,
      stage: record.stage,
      nextRunAt: record.nextRunAt,
      leaseUntil: record.leaseUntil,
      attempts: record.attempts,
      contentIdeaId: record.contentIdeaId,
      createdAt: record.createdAt,
      errorMessage: record.errorMessage,
      pausedQueues: pauses.map((row) => row.queueName),
      validTarget:
        publication.companyId === companyId &&
        content.companyId === companyId &&
        publication.contentId === content.id &&
        publication.socialAccount.companyId === companyId &&
        publication.provider === publication.socialAccount.platform &&
        publication.scheduledFor !== null &&
        (!generation ||
          (generation.companyId === companyId &&
            generation.contentId === content.id)) &&
        (!asset ||
          (asset.companyId === companyId && asset.contentId === content.id)),
      companyActive: publication.company.status === 'ACTIVE',
      rejected:
        ['REJECTED', 'ARCHIVED'].includes(content.status) ||
        publication.status === 'REJECTED',
      published: publication.status === 'PUBLISHED',
      approvalMode: publication.company.approvalMode,
      approved: record.approvedAt !== null && content.status === 'APPROVED',
      revisionMatches: record.revision === contentRevision(content),
      generation: generation
        ? {
          id: generation.id,
          status: generation.status,
          error: generation.errorMessage,
          createdAt: generation.createdAt,
          asset: asset
            ? {
              id: asset.id,
              ready: asset.status === 'READY' && !!asset.storageKey,
              publishable:
                asset.status === 'READY' &&
                !!asset.storageKey &&
                hasPublicMediaUrl(asset.metadata),
            }
            : null,
        }
        : null,
      validation: validation
        ? {
          status: validation.status,
          reason: validation.failureReason,
          hasRealVision: realVision,
          requiredChecksPassed:
            ['integrity', 'ocr', 'product', 'policy'].every(
              (name) => !!approvedCheck(name),
            ) &&
            (audioSource === 'no-audio' ||
              (audioSource === 'transcription' && !!approvedCheck('audio'))),
        }
        : null,
    };
  }
}

function evidenceSource(
  value: Prisma.JsonValue | undefined,
): Prisma.JsonValue | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value.source
    : undefined;
}

function hasPublicMediaUrl(value: Prisma.JsonValue): boolean {
  const url =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value.storageUrl
      : null;
  return typeof url === 'string' && url.startsWith('https://');
}


function hasBrownieImageFallback(content: { companyId: string; title: string; brief: string | null }): boolean {
  return content.companyId === '42159b3b-0a81-4620-b414-bc300dbee383'
    && /brownie de nutella/i.test(`${content.title} ${content.brief ?? ''}`);
}
