import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';
import { Publication } from '../domain/publication.entity.js';
import { PublicationRepository } from '../domain/publication.repository.interface.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';
import { PublicationGateService } from '../domain/publication-gate.service.interface.js';

export type CreatePublicationInput = {
  companyId: string;
  contentId: string;
  socialAccountId: string;
  provider?: string;
  scheduledFor?: Date | null;
};

import { ScheduledPublicationRepository } from '../../scheduling/domain/scheduled-publication.repository.js';

@Injectable()
export class CreatePublicationUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly socialAccountRepository: SocialAccountRepository,
    private readonly publicationRepository: PublicationRepository,
    private readonly publicationGateService: PublicationGateService,
    private readonly schedules: ScheduledPublicationRepository,
  ) {}

  async execute(input: CreatePublicationInput): Promise<Publication> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found for this company.');
    }
    //conta conectada
    const account = await this.socialAccountRepository.findById(input.socialAccountId);
    if (!account || account.companyId !== input.companyId) {
      throw new NotFoundException('Social account not found for this company.');
    }
    if (input.scheduledFor && !Number.isFinite(input.scheduledFor.getTime())) {
      throw new BadRequestException('A valid publication time is required.');
    }
    if (input.scheduledFor && (['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(content.status)
      || (input.provider && input.provider !== account.platform))) {
      throw new ConflictException('The content or account is ineligible for scheduled preparation.');
    }
    //gate pass
    const gate = await this.publicationGateService.authorize({
      companyId: input.companyId,
      contentId: input.contentId,
      socialAccountId: input.socialAccountId,
    });
    if (!input.scheduledFor && !gate.allowed) {
      throw new ForbiddenException(gate.reasons.join('; '));
    }

    const existing = await this.publicationRepository.findLatestByContentAndAccount(input.contentId, input.socialAccountId);
    if (existing && existing.status !== 'REJECTED' && existing.status !== 'FAILED') {
      throw new ConflictException('A publication already exists for this content on this social account.');
    }

    if (existing && input.scheduledFor) {
      await this.schedules.schedule({ companyId: input.companyId, publicationId: existing.id, scheduledFor: input.scheduledFor });
      return (await this.publicationRepository.findById(existing.id)) ?? existing;
    }
    if (existing?.scheduleId) {
      throw new ConflictException('Reschedule this publication through the scheduling endpoint.');
    }

    const publication = Publication.create({
      id: existing?.id,
      companyId: input.companyId,
      contentId: input.contentId,
      socialAccountId: input.socialAccountId,
      provider: input.provider ?? account.platform,
      scheduledFor: input.scheduledFor ?? null,
      status: input.scheduledFor ? 'SCHEDULED' : 'QUEUED',
      createdAt: existing?.createdAt,
    });

    return existing
      ? this.publicationRepository.update(publication)
      : this.publicationRepository.create(publication);
  }
}
