import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { VideoGenerationRepository } from '../../domain/video-generation.repository.interface.js';
import { VideoGenerationJobData, VideoGenerationQueue } from '../../domain/video-generation-queue.interface.js';
import { ProcessVideoGenerationUseCase } from '../../application/process-video-generation.use-case.js';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 360;

@Injectable()
export class VideoGenerationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoGenerationProcessor.name);
  private readonly validationQueue = new Queue<{ videoAssetId: string }>('video-validation', {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      username: process.env.REDIS_USERNAME ?? undefined,
      password: process.env.REDIS_PASSWORD ?? undefined,
    },
  });
  private worker: Worker<VideoGenerationJobData> | undefined;

  constructor(
    private readonly processVideoGeneration: ProcessVideoGenerationUseCase,
    private readonly videoGenerationRepository: VideoGenerationRepository,
    private readonly videoGenerationQueue: VideoGenerationQueue,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<VideoGenerationJobData>(
      'video-generation',
      (job) => this.processJob(job),
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          username: process.env.REDIS_USERNAME ?? undefined,
          password: process.env.REDIS_PASSWORD ?? undefined,
        },
        concurrency: Number(process.env.VIDEO_GENERATION_CONCURRENCY ?? 2),
      },
    );
    this.worker.on('error', (error) => this.logger.error('Video generation worker error', error.stack));
    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Video generation job ${job?.id ?? 'unknown'} failed for generation ${job?.data.videoGenerationId ?? 'unknown'}`,
        error.stack,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.validationQueue.close();
  }

  private async processJob(job: Job<VideoGenerationJobData>): Promise<void> {
    try {
      const asset = await this.processVideoGeneration.execute(job.data);
      if (asset.status === 'READY' && asset.videoAssetId) {
        await this.validationQueue.add(
          'validate-video',
          { videoAssetId: asset.videoAssetId },
          {
            jobId: `validate-${asset.videoAssetId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        return;
      }

      if (asset.status !== 'RENDERING' || !asset.renderJobId) {
        return;
      }

      const pollAttempt = job.data.pollAttempt ?? 0;
      if (pollAttempt >= MAX_POLL_ATTEMPTS) {
        asset.status = 'FAILED';
        asset.errorMessage = 'Video render did not complete within one hour';
        await this.videoGenerationRepository.update(asset);
        return;
      }

      await this.videoGenerationQueue.enqueue(job.data, {
        delayMs: POLL_INTERVAL_MS,
        pollAttempt: pollAttempt + 1,
      });
    } catch (error) {
      const generation = await this.videoGenerationRepository.findById(job.data.videoGenerationId);
      if (generation && generation.companyId === job.data.companyId) {
        const maxAttempts = job.opts.attempts ?? 1;
        const finalAttempt = job.attemptsMade + 1 >= maxAttempts;
        if (finalAttempt) {
          generation.status = 'FAILED';
        } else if (generation.status !== 'READY') {
          generation.status = 'QUEUED';
        }
        generation.errorMessage = error instanceof Error ? error.message : 'Video generation failed';
        await this.videoGenerationRepository.update(generation);
      }
      throw error;
    }
  }
}
