import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import { QueueName, SchedulingQueueService } from '../../domain/queue.service.interface.js';

@Injectable()
export class BullMqQueueService extends SchedulingQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(BullMqQueueService.name);
  private readonly connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    username: process.env.REDIS_USERNAME ?? undefined,
    password: process.env.REDIS_PASSWORD ?? undefined,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  };

  private readonly queues = new Map<string, Queue>();

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.queues.clear();
  }

  private getQueue(queueName: QueueName): Queue {
    const queue = this.queues.get(queueName);
    if (queue) {
      return queue;
    }

    const created = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });

    created.on('error', (error) => this.logger.warn(`Queue ${queueName}: ${error.message}`));
    this.queues.set(queueName, created);
    return created;
  }

  async schedule(input: {
    queueName: QueueName;
    jobName: string;
    data: Record<string, unknown>;
    delayMs?: number;
    jobId?: string;
    attempts?: number;
    deduplicate?: boolean;
    removeOnFail?: boolean;
  }): Promise<{ queueName: QueueName; jobId: string; status: 'scheduled' }> {
    const queue = this.getQueue(input.queueName);
    if (input.deduplicate) await this.waitForConnection(queue);

    const sanitizedJobId = input.jobId ? input.jobId.replace(/:/g, '_') : undefined;
    console.log('sanitizedJobId', sanitizedJobId)
    if (sanitizedJobId && !input.deduplicate) {
      const existing = await queue.getJob(sanitizedJobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'active') {
          throw new Error(`Cannot replace active BullMQ job ${sanitizedJobId}.`);
        }
        await existing.remove();
      }
    }

    const options: JobsOptions = {
      delay: input.delayMs ?? 0,
      attempts: input.attempts ?? 3,
      backoff: { type: 'exponential', delay: 5_000 },
      jobId: sanitizedJobId,
      removeOnComplete: true,
      removeOnFail: input.removeOnFail ?? false,
    };

    const job = await queue.add(input.jobName, input.data, options);
    return {
      queueName: input.queueName,
      jobId: job.id ?? sanitizedJobId ?? crypto.randomUUID(),
      status: 'scheduled',
    };
  }

  private async waitForConnection(queue: Queue): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        queue.waitUntilReady(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Redis queue is unavailable.')), 1_500);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async getJobState(queueName: QueueName, jobId: string): Promise<string> {
    const queue = this.getQueue(queueName);
    await this.waitForConnection(queue);
    return queue.getJobState(jobId);
  }

  async pause(queueName: QueueName, _reason?: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  async resume(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  async getQueueStatus(queueName: QueueName): Promise<{ queueName: QueueName; paused: boolean; waiting: number; active: number; delayed: number }> {
    const queue = this.getQueue(queueName);
    const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
    const paused = await queue.isPaused();
    return {
      queueName,
      paused,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
    };
  }
}
