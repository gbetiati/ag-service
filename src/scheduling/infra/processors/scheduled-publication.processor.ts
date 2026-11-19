import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Worker } from 'bullmq';
import { RunScheduledPublicationUseCase } from '../../application/run-scheduled-publication.use-case.js';
import { ScheduledPublicationQueue } from '../../application/scheduled-publication-queue.service.js';
import {
  ScheduleJob,
  ScheduledPublicationRepository,
} from '../../domain/scheduled-publication.repository.js';

@Injectable()
export class ScheduledPublicationProcessor implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ScheduledPublicationProcessor.name);
  private worker?: Worker<ScheduleJob>;
  private timer?: ReturnType<typeof setInterval>;
  private reconciliation?: Promise<void>;

  constructor(
    private readonly runSchedule: RunScheduledPublicationUseCase,
    private readonly schedules: ScheduledPublicationRepository,
    private readonly queue: ScheduledPublicationQueue,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<ScheduleJob>(
      'content-planning',
      async (job) => {
        if (job.name === 'prepare-scheduled-publication')
          await this.runSchedule.execute(job.data);
      },
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          username: process.env.REDIS_USERNAME ?? undefined,
          password: process.env.REDIS_PASSWORD ?? undefined,
        },
        concurrency: 2,
      },
    );
    this.worker.on('error', (error) => this.logger.error(error.message));
    this.worker.on('failed', (job) =>
      this.logger.warn(
        `Preparation job ${job?.id} failed; its database lease can be recovered.`,
      ),
    );
    this.timer = setInterval(() => this.startReconciliation(), 5_000);
    this.timer.unref();
    this.startReconciliation();
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.worker?.close();
    await this.reconciliation;
  }

  private startReconciliation(): void {
    if (this.reconciliation) return;
    this.reconciliation = this.reconcile().finally(() => {
      this.reconciliation = undefined;
    });
  }

  private async reconcile(): Promise<void> {
    try {
      const jobs = await this.schedules.due(new Date());
      for (let offset = 0; offset < jobs.length; offset += 10) {
        await Promise.all(
          jobs
            .slice(offset, offset + 10)
            .map((job) => this.queue.enqueueJob(job)),
        );
      }
    } catch {
      this.logger.warn(
        'Unable to reconcile scheduled publications; reconciliation will retry.',
      );
    }
  }
}
