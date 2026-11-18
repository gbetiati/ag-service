import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';
import { SchedulingQueueService } from '../../scheduling/domain/queue.service.interface.js';
import { Publication } from '../domain/publication.entity.js';
import { PublicationGateService } from '../domain/publication-gate.service.interface.js';
import { PublicationRepository } from '../domain/publication.repository.interface.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';

@Injectable()
export class QueueImmediatePublicationUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly socialAccountRepository: SocialAccountRepository,
    private readonly publicationRepository: PublicationRepository,
    private readonly publicationGateService: PublicationGateService,
    private readonly schedulingQueueService: SchedulingQueueService,
  ) {}

  async execute(input: { companyId: string; contentId: string; socialAccountId: string }): Promise<Publication> {
    const [content, account] = await Promise.all([
      this.contentRepository.findById(input.contentId),
      this.socialAccountRepository.findById(input.socialAccountId),
    ]);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found for this company.');
    }
    if (!account || account.companyId !== input.companyId) {
      throw new NotFoundException('Social account not found for this company.');
    }

    let publication = await this.publicationRepository.findLatestByContentAndAccount(
      input.contentId,
      input.socialAccountId,
    );
    if (publication?.status === 'PUBLISHED') {
      return publication;
    }
    if (publication?.scheduleId) {
      throw new ConflictException('This publication is managed by scheduled preparation.');
    }
    if (publication && publication?.status === 'SCHEDULED' && publication?.scheduledFor && publication?.scheduledFor > new Date()) {
      throw new ConflictException('This publication already has a future schedule; update or cancel that schedule first.');
    }

    const gate = await this.publicationGateService.authorize(input);
    if (!gate.allowed) {
      throw new ForbiddenException(gate.reasons.join('; '));
    }

    if (!publication) {
      publication = await this.publicationRepository.create(
        Publication.create({
          companyId: input.companyId,
          contentId: input.contentId,
          socialAccountId: input.socialAccountId,
          provider: account.platform,
          status: 'QUEUED',
        }),
      );
    } else {
      publication.status = 'QUEUED';
      publication.scheduledFor = null;
      publication.errorMessage = null;
      publication = await this.publicationRepository.update(publication);
    }

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

    return publication;
  }
}
