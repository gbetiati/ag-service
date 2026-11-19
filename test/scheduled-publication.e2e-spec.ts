import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaContentRepository } from '../src/content/infra/repositories/prisma-content.repository.js';
import { ContentStrategy } from '../src/content-strategy/application/content-strategy.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Publication } from '../src/publication/domain/publication.entity.js';
import { SocialCredential } from '../src/publication/domain/social-credential.entity.js';
import { PrismaPublicationRepository } from '../src/publication/infra/repositories/prisma-publication.repository.js';
import { PrismaSocialAccountRepository } from '../src/publication/infra/repositories/prisma-social-account.repository.js';
import { PublicationGateServiceImpl } from '../src/publication/infra/services/publication-gate.service.js';
import { RunScheduledPublicationUseCase } from '../src/scheduling/application/run-scheduled-publication.use-case.js';
import { ScheduledPublicationQueue } from '../src/scheduling/application/scheduled-publication-queue.service.js';
import {
  ScheduleJob,
  ScheduledRun,
} from '../src/scheduling/domain/scheduled-publication.repository.js';
import { ScheduledPublicationProcessor } from '../src/scheduling/infra/processors/scheduled-publication.processor.js';
import { PrismaScheduledPublicationRepository } from '../src/scheduling/infra/repositories/prisma-scheduled-publication.repository.js';
import { BullMqQueueService } from '../src/scheduling/infra/services/bullmq-queue.service.js';
import { PrismaVideoGenerationRepository } from '../src/video-generation/infra/repositories/prisma-video-generation.repository.js';

const databaseUrl = process.env.SCHEDULING_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)(
  'scheduled publication with PostgreSQL and Redis',
  () => {
    let prisma: PrismaService;
    let schedules: PrismaScheduledPublicationRepository;
    const companies: string[] = [];

    beforeAll(async () => {
      prisma = new PrismaService({ datasources: { db: { url: databaseUrl } } });
      schedules = new PrismaScheduledPublicationRepository(prisma);
      await prisma.$connect();
    });

    afterAll(async () => {
      if (!prisma) return;
      await prisma.company.deleteMany({ where: { id: { in: companies } } });
      await prisma.$disconnect();
    });

    async function fixture() {
      const key = crypto.randomUUID();
      const company = await prisma.company.create({
        data: { name: 'Scheduler test', slug: key },
      });
      companies.push(company.id);
      const companyId = company.id;
      const content = await prisma.content.create({
        data: { companyId, title: 'Draft', slug: 'draft', status: 'APPROVED' },
      });
      const product = await prisma.product.create({
        data: {
          companyId,
          name: 'Test product',
          slug: 'product',
          mediaAssets: {
            create: {
              companyId,
              fileName: 'catalog.jpg',
              originalName: 'catalog.jpg',
              storageKey: key,
              mimeType: 'image/jpeg',
              sizeBytes: 100,
            },
          },
        },
      });
      const account = await prisma.socialAccount.create({
        data: { companyId, platform: 'INSTAGRAM', accountHandle: key },
      });
      const publication = await prisma.publication.create({
        data: {
          companyId,
          contentId: content.id,
          socialAccountId: account.id,
          provider: 'INSTAGRAM',
        },
      });
      const schedule = (scheduledFor: Date) =>
        schedules.schedule({
          companyId,
          publicationId: publication.id,
          scheduledFor,
        });
      return { companyId, account, publication, product, content, schedule };
    }

    function job(run: ScheduledRun): ScheduleJob {
      return {
        id: run.id,
        companyId: run.companyId,
        dueAt: run.nextRunAt!.getTime(),
        stage: run.stage,
      };
    }

    const draft = (productId: string) => ({
      title: 'New editorial idea',
      summary: 'A new approach',
      script: 'The new video script.',
      productId,
    });

    it('claims three minutes before publication, fences rescheduling and rejects cross-tenant reads and delivery', async () => {
      const f = await fixture();
      const date = new Date(Date.now() + 300_000);
      const original = await f.schedule(date);
      expect(original.nextRunAt?.getTime()).toBe(date.getTime() - 180_000);
      expect((await f.schedule(date)).id).toBe(original.id);
      expect(
        await schedules.claim(
          job(original),
          new Date(original.nextRunAt!.getTime() - 1),
        ),
      ).toBeNull();
      expect(
        await schedules.claim(
          { ...job(original), companyId: 'other-company' },
          original.nextRunAt!,
        ),
      ).toBeNull();
      await expect(
        schedules.schedule({
          companyId: 'other-company',
          publicationId: f.publication.id,
          scheduledFor: date,
        }),
      ).rejects.toThrow('not found');
      const changed = await f.schedule(new Date(date.getTime() + 60_000));
      expect(changed.id).not.toBe(original.id);
      expect(
        await schedules.claim(job(original), changed.nextRunAt!),
      ).toBeNull();
      expect(
        await schedules.findByPublication('other-company', f.publication.id),
      ).toBeNull();
    });

    it('creates a single idea and render from concurrent deliveries and updates the existing content atomically', async () => {
      const f = await fixture();
      const run = await f.schedule(new Date());
      const claims = await Promise.all([
        schedules.claim(job(run), new Date()),
        schedules.claim(job(run), new Date()),
      ]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      const claimed = claims.find((row) => row !== null)!;
      const context = (await schedules.context(claimed))!;
      expect(
        await schedules.prepare(claimed, draft(f.product.id), context.revision),
      ).toBe(true);
      expect(
        await schedules.prepare(claimed, draft(f.product.id), context.revision),
      ).toBe(false);

      const current = await schedules.find(run);
      expect(current).toMatchObject({
        stage: 'RENDER',
        revisionMatches: true,
        generation: { id: run.id },
      });
      const saved = await prisma.content.findUniqueOrThrow({
        where: { id: f.content.id },
      });
      expect(saved).toMatchObject({
        script: 'The new video script.',
        status: 'DRAFT',
        productId: f.product.id,
      });
      expect(
        await prisma.content.count({ where: { companyId: f.companyId } }),
      ).toBe(1);
      expect(
        await prisma.contentIdea.count({ where: { companyId: f.companyId } }),
      ).toBe(1);
      expect(
        await prisma.contentPillar.count({ where: { companyId: f.companyId } }),
      ).toBe(1);
      await expect(
        schedules.approve({
          companyId: f.companyId,
          contentId: f.content.id,
          scheduleId: run.id,
        }),
      ).rejects.toThrow('approved video');

      const generations = new PrismaVideoGenerationRepository(prisma);
      const submissions = await Promise.all([
        generations.claimScheduledSubmission(run.id, f.companyId),
        generations.claimScheduledSubmission(run.id, f.companyId),
      ]);
      expect(submissions.filter(Boolean)).toHaveLength(1);
      await prisma.scheduledPublication.update({
        where: { id: run.id },
        data: { nextRunAt: null },
      });
    });

    it('recovers a removed Redis job and prepares the existing content after the schedule was already due', async () => {
      const f = await fixture();
      const run = await f.schedule(new Date(Date.now() - 60_000));
      const queues = new BullMqQueueService();
      const queue = new ScheduledPublicationQueue(queues);
      const strategy = new ContentStrategy({ generate: vi.fn() });
      const responseId = `resp_${run.id}`;
      const scripts = { submit: vi.fn().mockResolvedValue(responseId), result: vi.fn().mockResolvedValue(draft(f.product.id)) };
      const videoGeneration = { execute: vi.fn().mockResolvedValue({ status: 'RENDERING', videoAssetId: null }) };
      const useCase = new RunScheduledPublicationUseCase(
        schedules,
        strategy,
        scripts,
        videoGeneration as never,
        {} as never,
        {} as never,
      );
      const processor = new ScheduledPublicationProcessor(
        useCase,
        schedules,
        queue,
      );
      const planning = new Queue('content-planning', {
        connection: {
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number(process.env.REDIS_PORT ?? 6379),
        },
      });
      try {
        await queue.enqueue(run);
        const id = `scheduled-publication-${run.id}-PREPARE-${run.nextRunAt!.getTime()}`;
        expect(await planning.getJob(id)).toBeDefined();
        await (await planning.getJob(id))?.remove();
        expect(await planning.getJob(id)).toBeUndefined();
        processor.onModuleInit();
        await vi.waitFor(async () => {
          expect(await schedules.find(run)).toMatchObject({ stage: 'PREPARE', scriptResponseId: responseId, leaseUntil: null });
        });
        expect(scripts.result).not.toHaveBeenCalled();
        await schedules.notifyScript(responseId);
        await schedules.notifyScript(responseId);
        await vi.waitFor(
          async () => {
            expect(await schedules.find(run)).toMatchObject({
              stage: 'RENDER',
              revisionMatches: true,
            });
          },
          { timeout: 7_000, interval: 50 },
        );
        expect(scripts.submit).toHaveBeenCalledTimes(1);
        expect(scripts.result).toHaveBeenCalledTimes(1);
        await vi.waitFor(async () => {
          expect(videoGeneration.execute).toHaveBeenCalledTimes(1);
          expect(await schedules.find(run)).toMatchObject({ stage: 'RENDER', leaseUntil: null });
        }, { timeout: 7_000 });
        await prisma.videoGeneration.update({ where: { id: run.id }, data: { renderJobId: 'render-test' } });
        const video = await prisma.videoAsset.create({ data: {
          companyId: f.companyId, contentId: f.content.id, provider: 'CREATOMATE', status: 'READY',
          storageKey: 'video.mp4', metadata: { storageUrl: 'https://example.com/video.mp4' },
        } });
        videoGeneration.execute.mockImplementationOnce(async () => {
          await prisma.videoGeneration.update({ where: { id: run.id }, data: { status: 'READY', videoAssetId: video.id } });
          return { status: 'READY', videoAssetId: video.id };
        });
        await schedules.notifyRender(run.id, 'wrong-render');
        expect((await schedules.due(new Date())).some(({ id }) => id === run.id)).toBe(false);
        await schedules.notifyRender(run.id, 'render-test');
        await schedules.notifyRender(run.id, 'render-test');
        await vi.waitFor(async () => {
          expect(await schedules.find(run)).toMatchObject({ stage: 'VALIDATE' });
        }, { timeout: 7_000 });
        expect(videoGeneration.execute).toHaveBeenCalledTimes(2);
      } finally {
        await processor.onModuleDestroy();
        await queueCleanup(planning, run);
        const generationQueue = new Queue('video-generation', {
          connection: {
            host: process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(process.env.REDIS_PORT ?? 6379),
          },
        });
        await (
          await generationQueue.getJob(`scheduled-render-${run.id}`)
        )?.remove();
        await generationQueue.close();
        await planning.close();
        await queues.onModuleDestroy();
      }
    }, 24_000);

    it('blocks early delivery and wrong assets while manual approval is bypassed, and fences explicit approval by revision', async () => {
      const f = await fixture();
      const run = await f.schedule(new Date(Date.now() + 60_000));
      const claimed = (await schedules.claim(job(run), new Date()))!;
      await schedules.prepare(
        claimed,
        draft(f.product.id),
        (await schedules.context(claimed))!.revision,
      );
      const video = await prisma.videoAsset.create({
        data: {
          companyId: f.companyId,
          contentId: f.content.id,
          provider: 'CREATOMATE',
          status: 'READY',
          storageKey: 'video.mp4',
          metadata: { storageUrl: 'https://example.com/video.mp4' },
        },
      });
      await prisma.videoGeneration.update({
        where: { id: run.id },
        data: { status: 'READY', videoAssetId: video.id },
      });
      await prisma.scheduledPublication.update({
        where: { id: run.id },
        data: { stage: 'APPROVAL' },
      });

      const publications = new PrismaPublicationRepository(prisma);
      const gate = new PublicationGateServiceImpl(
        new PrismaContentRepository(prisma),
        new PrismaSocialAccountRepository(prisma),
        {
          findActiveBySocialAccount: async () =>
            SocialCredential.create({
              companyId: f.companyId,
              socialAccountId: f.account.id,
              kind: 'ACCESS_TOKEN',
              encryptedValue: 'test',
              initializationVector: 'test',
            }),
        } as never,
        publications,
        {} as never,
        {} as never,
        schedules,
      );
      const input = {
        companyId: f.companyId,
        contentId: f.content.id,
        socialAccountId: f.account.id,
        scheduleId: run.id,
        videoAssetId: video.id,
        checkSchedule: true,
      };
      expect((await gate.authorize(input)).allowed).toBe(false);
      const validation = await prisma.contentValidation.create({
        data: {
          companyId: f.companyId,
          contentId: f.content.id,
          videoAssetId: video.id,
          status: 'APPROVED',
          validatorVersion: 'fixture',
          results: {
            create: [
              'integrity',
              'ocr',
              'product',
              'policy',
              'vision',
              'audio',
            ].map((checkName) => ({
              checkName,
              status: 'APPROVED',
              passed: true,
              evidence: checkName === 'audio' ? { source: 'no-audio' } : {},
            })),
          },
        },
      });
      await prisma.validationResult.updateMany({
        where: { validationId: validation.id, checkName: 'vision' },
        data: { evidence: { source: 'multimodal' } },
      });
      await prisma.company.update({
        where: { id: f.companyId },
        data: { approvalMode: 'AUTOMATIC' },
      });
      expect((await gate.authorize(input)).allowed).toBe(false);
      await prisma.publication.update({
        where: { id: f.publication.id },
        data: { scheduledFor: new Date(Date.now() - 1000) },
      });
      expect((await gate.authorize(input)).allowed).toBe(true);
      await prisma.validationResult.updateMany({
        where: { validationId: validation.id, checkName: 'vision' },
        data: { evidence: {} },
      });
      expect((await gate.authorize(input)).allowed).toBe(true);
      await prisma.validationResult.updateMany({
        where: { validationId: validation.id, checkName: 'vision' },
        data: { evidence: { source: 'multimodal' } },
      });
      await prisma.company.update({
        where: { id: f.companyId },
        data: { approvalMode: 'MANUAL' },
      });
      expect((await gate.authorize(input)).allowed).toBe(true);
      await expect(
        schedules.approve({
          companyId: f.companyId,
          contentId: f.content.id,
          scheduleId: 'old-run',
        }),
      ).rejects.toThrow('current scheduled revision');
      await expect(
        schedules.approve({
          companyId: f.companyId,
          contentId: f.content.id,
          scheduleId: run.id,
        }),
      ).resolves.toBe(true);
      expect(
        (await gate.authorize({ ...input, videoAssetId: 'some-other-video' }))
          .allowed,
      ).toBe(false);
      expect((await gate.authorize(input)).allowed).toBe(true);
      expect(
        (await gate.authorize({ ...input, checkSchedule: false })).allowed,
      ).toBe(false);
      expect(
        (await gate.authorize({ ...input, scheduleId: undefined })).allowed,
      ).toBe(false);
      await prisma.content.update({
        where: { id: f.content.id },
        data: { script: 'Changed after validation' },
      });
      expect((await gate.authorize(input)).allowed).toBe(false);

      await prisma.content.update({
        where: { id: f.content.id },
        data: { script: 'The new video script.' },
      });
      const execute = vi.fn(async () => {
        expect(
          (await gate.authorize({ ...input, checkSchedule: false })).allowed,
        ).toBe(true);
        const publication = (await publications.findById(f.publication.id))!;
        publication.markPublished('instagram-test-receipt');
        return publications.completeScheduled(publication, run.id);
      });
      const orchestration = new RunScheduledPublicationUseCase(
        schedules,
        {} as never,
        {} as never,
        { enqueue: vi.fn() } as never,
        gate,
        { execute } as never,
      );
      const due = job((await schedules.find(run))!);
      await Promise.all([
        orchestration.execute(due),
        orchestration.execute(due),
      ]);
      expect(execute).toHaveBeenCalledTimes(1);
      expect(await schedules.find(run)).toMatchObject({
        published: true,
        stage: 'PUBLISHED',
      });
      expect(
        await prisma.publicationAttempt.count({
          where: { publicationId: f.publication.id, status: 'PUBLISHED' },
        }),
      ).toBe(1);
    });

    it('persists a dated publication and its preparation in one write', async () => {
      const f = await fixture();
      const secondAccount = await prisma.socialAccount.create({
        data: {
          companyId: f.companyId,
          platform: 'INSTAGRAM',
          accountHandle: crypto.randomUUID(),
        },
      });
      const publications = new PrismaPublicationRepository(prisma);
      const scheduledFor = new Date(Date.now() + 240_000);
      const publication = await publications.create(
        Publication.create({
          companyId: f.companyId,
          contentId: f.content.id,
          provider: 'INSTAGRAM',
          status: 'SCHEDULED',
          socialAccountId: secondAccount.id,
          scheduledFor,
        }),
      );
      expect(publication.scheduleId).toBeTruthy();
      expect(
        await schedules.findByPublication(f.companyId, publication.id),
      ).toMatchObject({
        id: publication.scheduleId,
        stage: 'PREPARE',
        nextRunAt: new Date(scheduledFor.getTime() - 180_000),
      });
      await expect(f.schedule(scheduledFor)).rejects.toThrow(
        'another active schedule',
      );
      expect(
        await schedules.findByPublication(f.companyId, f.publication.id),
      ).toBeNull();
    });
  },
);

async function queueCleanup(queue: Queue, run: ScheduledRun): Promise<void> {
  const jobs = await queue.getJobs(['waiting', 'delayed', 'failed']);
  await Promise.all(
    jobs.filter((job) => job.data.id === run.id).map((job) => job.remove()),
  );
}
