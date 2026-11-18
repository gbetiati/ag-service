import { Injectable, Logger } from '@nestjs/common';
import { SchedulingQueueService } from '../domain/queue.service.interface.js';
import {
  ScheduleJob,
  ScheduledRun,
} from '../domain/scheduled-publication.repository.js';

@Injectable()
export class ScheduledPublicationQueue {
  private readonly logger = new Logger(ScheduledPublicationQueue.name);

  constructor(private readonly queues: SchedulingQueueService) {}

  async enqueue(run: ScheduledRun): Promise<void> {
    if (run.nextRunAt) {
      await this.enqueueJob({
        id: run.id,
        companyId: run.companyId,
        dueAt: run.nextRunAt.getTime(),
        stage: run.stage,
      });
    }
  }

  async enqueueJob(job: ScheduleJob): Promise<void> {
    try {
      await this.queues.schedule({
        queueName:
          job.stage === 'PUBLISH' || job.stage === 'PUBLISHING'
            ? 'social-publishing'
            : 'content-planning',
        jobName: 'prepare-scheduled-publication',
        data: job,
        jobId: `scheduled-publication-${job.id}-${job.stage}-${job.dueAt}`,
        delayMs: Math.max(0, job.dueAt - Date.now()),
        attempts: 1,
        deduplicate: true,
        removeOnFail: true,
      });
    } catch {
      this.logger.warn(
        `Preparation job for schedule ${job.id} could not be queued; reconciliation will retry.`,
      );
    }
  }
}
