import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../domain/queue.service.interface.js';

export const BULL_BOARD_BASE_PATH = '/admin/queues';

@Injectable()
export class BullBoardService implements OnModuleDestroy {
  readonly basePath = BULL_BOARD_BASE_PATH;
  private readonly enabled: boolean;
  private readonly queues: Queue[] = [];
  private readonly serverAdapter: ExpressAdapter | null;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('BULL_BOARD_ENABLED') === 'true';

    if (!this.enabled) {
      this.serverAdapter = null;
      return;
    }

    const connection = {
      host: this.configService.get<string>('REDIS_HOST') ?? 'localhost',
      port: Number(this.configService.get<string>('REDIS_PORT') ?? 6379),
      username: this.configService.get<string>('REDIS_USERNAME') ?? undefined,
      password: this.configService.get<string>('REDIS_PASSWORD') ?? undefined,
    };

    this.queues = Object.values(QUEUE_NAMES).map(
      (queueName) =>
        new Queue(queueName, {
          connection,
        }),
    );

    const adapter = new ExpressAdapter();
    adapter.setBasePath(this.basePath);
    createBullBoard({
      queues: this.queues.map((queue) => new BullMQAdapter(queue)),
      serverAdapter: adapter,
    });
    this.serverAdapter = adapter;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getServerAdapter(): ExpressAdapter {
    if (!this.serverAdapter) {
      throw new Error('Bull Board is disabled. Set BULL_BOARD_ENABLED=true to enable it.');
    }
    return this.serverAdapter;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.queues.map((queue) => queue.close()));
    this.queues.length = 0;
  }
}
