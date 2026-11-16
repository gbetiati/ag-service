import { Injectable } from '@nestjs/common';
import { ContentRepository } from '../../../content/domain/content.repository.interface.js';
import { ContentValidationRepository } from '../../../video-validation/domain/content-validation.repository.interface.js';
import { PublicationGateService, PublicationGateDecision } from '../../domain/publication-gate.service.interface.js';
import { SocialAccountRepository } from '../../domain/social-account.repository.interface.js';
import { PublicationRepository } from '../../domain/publication.repository.interface.js';

@Injectable()
export class PublicationGateServiceImpl extends PublicationGateService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly socialAccountRepository: SocialAccountRepository,
    private readonly publicationRepository: PublicationRepository,
    private readonly contentValidationRepository: ContentValidationRepository,
  ) {
    super();
  }

  async authorize(input: { companyId: string; contentId: string; socialAccountId: string }): Promise<PublicationGateDecision> {
    const reasons: string[] = [];

    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      reasons.push('Content not found for this company.');
      return { allowed: false, reasons };
    }

    const socialAccount = await this.socialAccountRepository.findById(input.socialAccountId);
    if (!socialAccount || socialAccount.companyId !== input.companyId) {
      reasons.push('Social account not found for this company.');
      return { allowed: false, reasons };
    }

    if (content.status !== 'APPROVED') {
      reasons.push('Content must be approved before publication.');
    }

    const latestValidation = await this.contentValidationRepository.findLatestByContent(input.contentId);
    if (!latestValidation || latestValidation.status !== 'APPROVED') {
      reasons.push('The content has not passed the independent validation gate.');
    }

    if (socialAccount.status !== 'ACTIVE') {
      reasons.push('The social account is not active.');
    }

    const duplicatePublication = await this.publicationRepository.findLatestByContentAndAccount(input.contentId, input.socialAccountId);
    if (duplicatePublication && duplicatePublication.status === 'PUBLISHED') {
      reasons.push('This content has already been published to this social account.');
    }

    return {
      allowed: reasons.length === 0,
      reasons,
    };
  }
}
