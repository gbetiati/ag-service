import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DelayedError, Job, Worker } from 'bullmq';
import { PublicationAttempt } from '../../../publication/domain/publication-attempt.entity.js';
import { PublicationAttemptRepository } from '../../../publication/domain/publication-attempt.repository.interface.js';
import { PublicationRepository } from '../../../publication/domain/publication.repository.interface.js';
import { PublishContentUseCase } from '../../../publication/application/publish-content.use-case.js';
import { RunScheduledPublicationUseCase } from '../../application/run-scheduled-publication.use-case.js';
import { AutomationStateRepository } from '../../domain/automation-state.repository.interface.js';
import { ScheduleJob } from '../../domain/scheduled-publication.repository.js';

type LegacySocialPublishingJob = {
  companyId: string;
  publicationId: string;
};


type SocialPublishingJobData = LegacySocialPublishingJob | ScheduleJob;

@Injectable()
export class SocialPublishingProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialPublishingProcessor.name);
  private worker: Worker<SocialPublishingJobData> | undefined;

  constructor(
    private readonly publicationRepository: PublicationRepository,
    private readonly publicationAttemptRepository: PublicationAttemptRepository,
    private readonly publishContent: PublishContentUseCase,
    private readonly automation: AutomationStateRepository,
    private readonly runSchedule: RunScheduledPublicationUseCase,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<SocialPublishingJobData>(
      'social-publishing',
      (job, token) => this.processJob(job, token),
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          username: process.env.REDIS_USERNAME ?? undefined,
          password: process.env.REDIS_PASSWORD ?? undefined,
        },
        concurrency: Number(process.env.SOCIAL_PUBLISHING_CONCURRENCY ?? 2),
      },
    );
    this.worker.on('error', (error) => this.logger.error('Social publishing worker error', error.stack));
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Social publishing job ${job?.id ?? 'unknown'} failed`, error.stack);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async processJob(job: Job<SocialPublishingJobData>, token?: string): Promise<void> {
    const data = job.data;
    if (job.name === 'prepare-scheduled-publication' && 'dueAt' in data) {
      await this.runSchedule.execute(data);
      return;
    }
    if (!('publicationId' in data)) return;
    const publication = await this.publicationRepository.findById(data.publicationId);
    if (!publication || publication.companyId !== data.companyId) {
      throw new Error('Scheduled publication not found for this company.');
    }
    if (publication.scheduleId || publication.status === 'PUBLISHED') {
      return;
    }
    if (!['QUEUED', 'SCHEDULED'].includes(publication.status)) {
      return;
    }
    if (publication.scheduledFor && publication.scheduledFor.getTime() > Date.now()) {
      return;
    }

    const pause = await this.automation.findByCompanyAndQueue(data.companyId, 'social-publishing');
    if (pause?.paused) {
      await job.moveToDelayed(Date.now() + 30_000, token);
      throw new DelayedError();
    }

    try {
      await this.publishContent.execute({
        companyId: data.companyId,
        contentId: publication.contentId,
        socialAccountId: publication.socialAccountId,
      });
    } catch (error) {
      const persistedPublication = await this.publicationRepository.findById(publication.id);
      if (persistedPublication?.scheduleId || persistedPublication?.status === 'PUBLISHED') {
        return;
      }

      const attempts = await this.publicationAttemptRepository.findByPublication(publication.id);
      const message = error instanceof Error ? error.message : 'Publication failed';
      await this.publicationAttemptRepository.create(
        PublicationAttempt.create({
          publicationId: publication.id,
          attemptNumber: attempts.reduce((max, attempt) => Math.max(max, attempt.attemptNumber), 0) + 1,
          status: 'FAILED',
          errorMessage: message,
        }),
      );

      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isFinalAttempt) {
        publication.fail(message);
        await this.publicationRepository.update(publication);
      }
      throw error;
    }
  }
}
