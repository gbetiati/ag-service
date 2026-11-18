import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { PublicationAttempt } from '../../../publication/domain/publication-attempt.entity.js';
import { PublicationAttemptRepository } from '../../../publication/domain/publication-attempt.repository.interface.js';
import { PublicationRepository } from '../../../publication/domain/publication.repository.interface.js';
import { PublishContentUseCase } from '../../../publication/application/publish-content.use-case.js';

type SocialPublishingJobData = {
  companyId: string;
  publicationId: string;
};

@Injectable()
export class SocialPublishingProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialPublishingProcessor.name);
  private worker: Worker<SocialPublishingJobData> | undefined;

  constructor(
    private readonly publicationRepository: PublicationRepository,
    private readonly publicationAttemptRepository: PublicationAttemptRepository,
    private readonly publishContent: PublishContentUseCase,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<SocialPublishingJobData>(
      'social-publishing',
      (job) => this.processJob(job),
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

  private async processJob(job: Job<SocialPublishingJobData>): Promise<void> {
    const data = job.data;
    const publication = await this.publicationRepository.findById(data.publicationId);
    if (!publication || publication.companyId !== data.companyId) {
      throw new Error('Scheduled publication not found for this company.');
    }
    if (publication.status === 'PUBLISHED') {
      return;
    }
    if (!['QUEUED', 'SCHEDULED'].includes(publication.status)) {
      return;
    }
    if (publication.scheduledFor && publication.scheduledFor.getTime() > Date.now()) {
      return;
    }

    try {
      await this.publishContent.execute({
        companyId: data.companyId,
        contentId: publication.contentId,
        socialAccountId: publication.socialAccountId,
      });
    } catch (error) {
      const persistedPublication = await this.publicationRepository.findById(publication.id);
      if (persistedPublication?.status === 'PUBLISHED') {
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
