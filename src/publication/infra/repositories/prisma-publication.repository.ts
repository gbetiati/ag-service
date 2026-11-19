import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Publication } from '../../domain/publication.entity.js';
import { PublicationRepository } from '../../domain/publication.repository.interface.js';
import { PREPARATION_LEAD_MS, contentRevision } from '../../../scheduling/domain/scheduled-publication.repository.js';

const include = { preparation: { select: { id: true } } } as const;

@Injectable()
export class PrismaPublicationRepository extends PublicationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(publication: Publication): Promise<Publication> {
    try {
      const record = await this.prisma.publication.create({
        include,
        data: {
          id: publication.id,
          companyId: publication.companyId,
          contentId: publication.contentId,
          socialAccountId: publication.socialAccountId,
          status: publication.status,
          provider: publication.provider,
          scheduledFor: publication.scheduledFor,
          publishedAt: publication.publishedAt,
          externalPostId: publication.externalPostId,
          metadata: (publication.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          errorMessage: publication.errorMessage,
          createdAt: publication.createdAt,
          updatedAt: publication.updatedAt,
          ...(publication.scheduledFor ? {
            preparation: { create: {
              companyId: publication.companyId, contentId: publication.contentId,
              nextRunAt: new Date(publication.scheduledFor.getTime() - PREPARATION_LEAD_MS),
            } },
          } : {}),
        },
      });
      return this.toEntity(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A publication or another active schedule already exists for this content.');
      }
      throw error;
    }
  }

  async update(publication: Publication): Promise<Publication> {
    const record = await this.prisma.publication.update({
      where: {
        id: publication.id, companyId: publication.companyId,
        preparation: null,
      },
      include,
      data: {
        status: publication.status,
        provider: publication.provider,
        scheduledFor: publication.scheduledFor,
        publishedAt: publication.publishedAt,
        externalPostId: publication.externalPostId,
        metadata: (publication.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: publication.errorMessage,
        updatedAt: publication.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async completeScheduled(publication: Publication, scheduleId: string): Promise<Publication> {
    return this.prisma.$transaction(async (tx) => {
      const { companyId, contentId } = publication;
      const run = await tx.scheduledPublication.update({
        where: {
          id: scheduleId, companyId, contentId, publicationId: publication.id,
          stage: { in: ['PUBLISHING', 'RECONCILIATION_REQUIRED'] },
        },
        data: { stage: 'PUBLISHED', nextRunAt: null, leaseUntil: null, errorMessage: null },
      });
      const metadata = publication.metadata as Prisma.InputJsonValue | null;
      const saved = await tx.publication.update({
        where: { id: publication.id, companyId, contentId, externalPostId: null },
        data: {
          status: 'PUBLISHED', externalPostId: publication.externalPostId, publishedAt: publication.publishedAt,
          metadata: metadata ?? undefined, errorMessage: null,
        },
        include,
      });
      const attempts = await tx.publicationAttempt.aggregate({ where: { publicationId: publication.id }, _max: { attemptNumber: true } });
      await tx.publicationAttempt.create({
        data: {
          publicationId: publication.id, attemptNumber: (attempts._max.attemptNumber ?? 0) + 1,
          status: 'PUBLISHED', providerResponse: metadata ?? { externalPostId: publication.externalPostId },
        },
      });
      const content = await tx.content.findFirst({ where: { id: contentId, companyId } });
      if (content && run.revision === contentRevision(content) && !['REJECTED', 'ARCHIVED'].includes(content.status)) {
        await tx.content.updateMany({
          where: { id: contentId, companyId, updatedAt: content.updatedAt },
          data: { status: 'PUBLISHED' },
        });
      }
      return this.toEntity(saved);
    });
  }

  async findById(id: string): Promise<Publication | null> {
    const record = await this.prisma.publication.findUnique({ where: { id }, include });
    return record ? this.toEntity(record) : null;
  }

  async findByCompany(companyId: string): Promise<Publication[]> {
    const records = await this.prisma.publication.findMany({ where: { companyId }, include });
    return records.map((record) => this.toEntity(record));
  }

  async findByContent(contentId: string): Promise<Publication[]> {
    const records = await this.prisma.publication.findMany({ where: { contentId }, include });
    return records.map((record) => this.toEntity(record));
  }

  async findLatestByContentAndAccount(contentId: string, socialAccountId: string): Promise<Publication | null> {
    const records = await this.prisma.publication.findMany({
      where: { contentId, socialAccountId },
      orderBy: { createdAt: 'desc' },
      take: 1,
      include,
    });

    return records[0] ? this.toEntity(records[0]) : null;
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    contentId: string;
    socialAccountId: string;
    status: string;
    provider: string;
    scheduledFor: Date | null;
    publishedAt: Date | null;
    externalPostId: string | null;
    metadata: Prisma.JsonValue | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    preparation: { id: string } | null;
  }): Publication {
    return new Publication(
      record.id,
      record.companyId,
      record.contentId,
      record.socialAccountId,
      record.status as any,
      record.provider,
      record.scheduledFor,
      record.publishedAt,
      record.externalPostId,
      record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : record.metadata !== null
          ? ({ value: record.metadata } as Record<string, unknown>)
          : null,
      record.errorMessage,
      record.createdAt,
      record.updatedAt,
      record.preparation?.id ?? null,
    );
  }
}
