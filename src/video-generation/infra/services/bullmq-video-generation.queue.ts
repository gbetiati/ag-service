import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  VideoGenerationJobData,
  VideoGenerationJobSummary,
  VideoGenerationQueue,
} from '../../domain/video-generation-queue.interface.js';

@Injectable()
export class BullMqVideoGenerationQueue extends VideoGenerationQueue implements OnModuleDestroy {
  private readonly queue = new Queue<VideoGenerationJobData>('video-generation', {
    connection: this.connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 7 * 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 30 * 24 * 60 * 60, count: 5000 },
    },
  });

  async enqueue(
    data: VideoGenerationJobData,
    options: { delayMs?: number; pollAttempt?: number } = {},
  ): Promise<{ jobId: string }> {
    const pollAttempt = options.pollAttempt ?? data.pollAttempt ?? 0;
    const jobData = { ...data, pollAttempt };
    const job = await this.queue.add('generate-video', jobData, {
      delay: options.delayMs ?? 0,
      jobId: this.getJobId(data.videoGenerationId, pollAttempt),
    });
    return { jobId: job.id ?? this.getJobId(data.videoGenerationId, pollAttempt) };
  }

  async getCompanyJobs(companyId: string): Promise<VideoGenerationJobSummary[]> {
    const states = ['waiting', 'active', 'delayed', 'failed', 'completed'] as const;
    const jobs = await this.queue.getJobs([...states], 0, 999, true);
    const companyJobs = jobs.filter((job) => job.data.companyId === companyId);

    const summaries = await Promise.all(
      companyJobs.map(async (job) => ({
        jobId: job.id ?? this.getJobId(job.data.videoGenerationId, job.data.pollAttempt ?? 0),
        videoGenerationId: job.data.videoGenerationId,
        state: await job.getState(),
        failedReason: job.failedReason || null,
        createdAt: job.timestamp,
      })),
    );
    return summaries.sort((left, right) => right.createdAt - left.createdAt);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  private getJobId(videoGenerationId: string, pollAttempt: number): string {
    return `video-generation-${videoGenerationId}-${pollAttempt}`;
  }

  private get connection() {
    return {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      username: process.env.REDIS_USERNAME ?? undefined,
      password: process.env.REDIS_PASSWORD ?? undefined,
    };
  }
}
