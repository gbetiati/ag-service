import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QueueName } from '../domain/queue.service.interface.js';
import { ScheduledPublicationRepository, ScheduledRun } from '../domain/scheduled-publication.repository.js';
import { ScheduledPublicationQueue } from './scheduled-publication-queue.service.js';

export type SchedulePublicationInput = {
  companyId: string;
  publicationId: string;
  scheduledFor: Date;
  queueName?: QueueName;
};

@Injectable()
export class SchedulePublicationUseCase {
  constructor(
    private readonly schedules: ScheduledPublicationRepository,
    private readonly queue: ScheduledPublicationQueue,
  ) {}

  async execute(input: SchedulePublicationInput) {
    if (input.queueName && input.queueName !== 'social-publishing') {
      throw new BadRequestException('Publication schedules must target the social-publishing queue.');
    }
    if (!Number.isFinite(input.scheduledFor.getTime())) {
      throw new BadRequestException('A valid publication time is required.');
    }
    const run = await this.schedules.schedule(input);
    await this.queue.enqueue(run);
    return this.details(run);
  }

  async get(companyId: string, publicationId: string) {
    const run = await this.schedules.findByPublication(companyId, publicationId);
    if (!run) throw new NotFoundException('Scheduled preparation not found for this company.');
    return this.details(run);
  }

  private details(run: ScheduledRun) {
    return {
      id: run.publicationId,
      scheduleId: run.id,
      status: run.stage === 'PUBLISHED' ? 'PUBLISHED' : ['FAILED', 'RECONCILIATION_REQUIRED'].includes(run.stage) ? 'FAILED' : 'SCHEDULED',
      scheduledFor: run.scheduledFor,
      nextRunAt: run.nextRunAt,
      stage: run.stage,
      contentIdeaId: run.contentIdeaId,
      videoAssetId: run.generation?.asset?.id ?? null,
      errorMessage: run.errorMessage,
    };
  }
}
