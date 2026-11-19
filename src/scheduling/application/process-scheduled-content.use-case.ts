import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PublicationRepository } from '../../publication/domain/publication.repository.interface.js';
import { PublicationGateService } from '../../publication/domain/publication-gate.service.interface.js';
import { ScheduledPublicationRepository } from '../domain/scheduled-publication.repository.js';
import { ScheduledPublicationQueue } from './scheduled-publication-queue.service.js';
import { SchedulingQueueService } from '../domain/queue.service.interface.js';

export type ProcessScheduledContentInput = {
  companyId: string;
  publicationId: string;
};

@Injectable()
export class ProcessScheduledContentUseCase {
  constructor(
    private readonly publicationRepository: PublicationRepository,
    private readonly schedulingQueueService: SchedulingQueueService,
    private readonly publicationGateService: PublicationGateService,
    private readonly schedules: ScheduledPublicationRepository,
    private readonly scheduledQueue: ScheduledPublicationQueue,
  ) {}

  async execute(input: ProcessScheduledContentInput): Promise<{ id: string; status: string; scheduledFor: Date | null }> {
    const publication = await this.publicationRepository.findById(input.publicationId);
    if (!publication || publication.companyId !== input.companyId) {
      throw new NotFoundException('Publication not found for this company.');
    }

    const scheduled = await this.schedules.findByPublication(input.companyId, input.publicationId);
    if (scheduled) {
      await this.scheduledQueue.enqueue(scheduled);
      return { id: publication.id, status: publication.status, scheduledFor: publication.scheduledFor };
    }

    if (publication.status === 'PUBLISHED') {
      return { id: publication.id, status: publication.status, scheduledFor: publication.scheduledFor };
    }

    if (publication.scheduledFor && publication.scheduledFor.getTime() > Date.now()) {
      return { id: publication.id, status: publication.status, scheduledFor: publication.scheduledFor };
    }

    const gate = await this.publicationGateService.authorize({
      companyId: input.companyId,
      contentId: publication.contentId,
      socialAccountId: publication.socialAccountId,
    });
    if (!gate.allowed) {
      throw new ForbiddenException(gate.reasons.join('; '));
    }

    publication.status = 'QUEUED';
    publication.scheduledFor = null;
    const updated = await this.publicationRepository.update(publication);
    try {
      await this.schedulingQueueService.schedule({
        queueName: 'social-publishing',
        jobName: 'publish-content',
        data: {
          companyId: input.companyId,
          publicationId: publication.id,
        },
        jobId: `publication-${publication.id}`,
        attempts: 3,
      });
    } catch (error) {
      publication.fail(error instanceof Error ? error.message : 'Unable to queue publication');
      await this.publicationRepository.update(publication);
      throw error;
    }

    return {
      id: updated.id,
      status: updated.status,
      scheduledFor: updated.scheduledFor,
    };
  }
}
