import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';
import { Publication } from '../domain/publication.entity.js';
import { PublicationRepository } from '../domain/publication.repository.interface.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';

export type CreatePublicationInput = {
  companyId: string;
  contentId: string;
  socialAccountId: string;
  provider?: string;
  scheduledFor?: Date | null;
};

@Injectable()
export class CreatePublicationUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly socialAccountRepository: SocialAccountRepository,
    private readonly publicationRepository: PublicationRepository,
  ) {}

  async execute(input: CreatePublicationInput): Promise<Publication> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found for this company.');
    }

    const account = await this.socialAccountRepository.findById(input.socialAccountId);
    if (!account || account.companyId !== input.companyId) {
      throw new NotFoundException('Social account not found for this company.');
    }

    const existing = await this.publicationRepository.findLatestByContentAndAccount(input.contentId, input.socialAccountId);
    if (existing && existing.status !== 'REJECTED' && existing.status !== 'FAILED') {
      throw new ConflictException('A publication already exists for this content on this social account.');
    }

    const publication = Publication.create({
      companyId: input.companyId,
      contentId: input.contentId,
      socialAccountId: input.socialAccountId,
      provider: input.provider ?? account.platform,
      scheduledFor: input.scheduledFor ?? null,
      status: 'QUEUED',
    });

    return this.publicationRepository.create(publication);
  }
}
