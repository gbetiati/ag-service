import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';
import { SocialCredentialRepository } from '../domain/social-credential.repository.interface.js';
import { PublicationAttemptRepository } from '../domain/publication-attempt.repository.interface.js';
import { PublicationRepository } from '../domain/publication.repository.interface.js';
import { PublicationGateService } from '../domain/publication-gate.service.interface.js';
import { SocialPublisher } from '../domain/social-publisher.interface.js';
import { Publication } from '../domain/publication.entity.js';
import { PublicationAttempt } from '../domain/publication-attempt.entity.js';

export type PublishContentInput = {
  companyId: string;
  contentId: string;
  socialAccountId: string;
};

@Injectable()
export class PublishContentUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly socialAccountRepository: SocialAccountRepository,
    private readonly socialCredentialRepository: SocialCredentialRepository,
    private readonly publicationRepository: PublicationRepository,
    private readonly publicationAttemptRepository: PublicationAttemptRepository,
    private readonly publicationGateService: PublicationGateService,
    private readonly socialPublisher: SocialPublisher,
  ) {}

  async execute(input: PublishContentInput): Promise<Publication> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found for this company.');
    }

    const socialAccount = await this.socialAccountRepository.findById(input.socialAccountId);
    if (!socialAccount || socialAccount.companyId !== input.companyId) {
      throw new NotFoundException('Social account not found for this company.');
    }

    const gate = await this.publicationGateService.authorize({
      companyId: input.companyId,
      contentId: input.contentId,
      socialAccountId: input.socialAccountId,
    });

    if (!gate.allowed) {
      throw new UnauthorizedException(gate.reasons.join('; '));
    }

    let publication = await this.publicationRepository.findLatestByContentAndAccount(input.contentId, input.socialAccountId);
    if (!publication) {
      publication = Publication.create({
        companyId: input.companyId,
        contentId: input.contentId,
        socialAccountId: input.socialAccountId,
        provider: socialAccount.platform,
      });
      publication = await this.publicationRepository.create(publication);
    }

    const credential = await this.socialCredentialRepository.findActiveBySocialAccount(input.socialAccountId);
    if (!credential) {
      throw new NotFoundException('No active credential found for this social account.');
    }

    const result = await this.socialPublisher.publish({
      companyId: input.companyId,
      contentId: input.contentId,
      publication,
      socialAccount,
      credential,
    });

    publication.markPublished(result.externalPostId, result.metadata ?? null);
    publication = await this.publicationRepository.update(publication);

    const attempt = PublicationAttempt.create({
      publicationId: publication.id,
      attemptNumber: 1,
      status: 'PUBLISHED',
      providerResponse: result.metadata ?? { externalPostId: result.externalPostId },
    });
    await this.publicationAttemptRepository.create(attempt);

    const updatedContent = await this.contentRepository.findById(input.contentId);
    if (updatedContent) {
      updatedContent.publish();
      await this.contentRepository.update(updatedContent);
    }

    return publication;
  }
}
