import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PublicationRepository } from '../../publication/domain/publication.repository.interface.js';
import { AutomationStateRepository } from '../domain/automation-state.repository.interface.js';
import { SchedulingQueueService } from '../domain/queue.service.interface.js';

export type SchedulePublicationInput = {
  companyId: string;
  publicationId: string;
  scheduledFor: Date;
  queueName?: 'content-planning' | 'video-generation' | 'video-validation' | 'social-publishing' | 'notifications';
};

@Injectable()
export class SchedulePublicationUseCase {
  constructor(
    private readonly publicationRepository: PublicationRepository,
    private readonly automationStateRepository: AutomationStateRepository,
    private readonly schedulingQueueService: SchedulingQueueService,
  ) {}

  async execute(input: SchedulePublicationInput): Promise<{ id: string; status: string; scheduledFor: Date }> {
    const publication = await this.publicationRepository.findById(input.publicationId);
    if (!publication || publication.companyId !== input.companyId) {
      throw new NotFoundException('Publication not found for this company.');
    }

    const queueName = input.queueName ?? 'social-publishing';
    const automationState = await this.automationStateRepository.findByCompanyAndQueue(input.companyId, queueName);
    if (automationState?.paused) {
      throw new ForbiddenException(automationState.reason ?? 'Automation is paused for this queue.');
    }

    const scheduledFor = new Date(input.scheduledFor);
    const now = Date.now();
    const delayMs = Math.max(0, scheduledFor.getTime() - now);

    publication.status = scheduledFor.getTime() <= now ? 'QUEUED' : 'SCHEDULED';
    publication.scheduledFor = scheduledFor;
    await this.publicationRepository.update(publication);

    const jobId = `publication:${publication.id}`;
    await this.schedulingQueueService.schedule({
      queueName,
      jobName: 'publish-content',
      data: {
        companyId: input.companyId,
        publicationId: publication.id,
        contentId: publication.contentId,
        socialAccountId: publication.socialAccountId,
      },
      delayMs,
      jobId,
      attempts: 3,
    });

    return {
      id: publication.id,
      status: publication.status,
      scheduledFor,
    };
  }
}
