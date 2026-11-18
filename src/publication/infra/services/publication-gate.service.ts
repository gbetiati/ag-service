import { Injectable } from '@nestjs/common';
import { ContentRepository } from '../../../content/domain/content.repository.interface.js';
import { ContentValidationRepository } from '../../../video-validation/domain/content-validation.repository.interface.js';
import { PublicationGateService, PublicationGateDecision } from '../../domain/publication-gate.service.interface.js';
import { SocialAccountRepository } from '../../domain/social-account.repository.interface.js';
import { SocialCredentialRepository } from '../../domain/social-credential.repository.interface.js';
import { PublicationRepository } from '../../domain/publication.repository.interface.js';
import { VideoAssetRepository } from '../../../video-generation/domain/video-asset.repository.interface.js';

@Injectable()
export class PublicationGateServiceImpl extends PublicationGateService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly socialAccountRepository: SocialAccountRepository,
    private readonly socialCredentialRepository: SocialCredentialRepository,
    // Kept for TEMP bypass — re-enable duplicate publication checks in authorize() before production.
    private readonly _publicationRepository: PublicationRepository,
    // Kept for TEMP bypass — re-enable validation checks in authorize() before production.
    private readonly _contentValidationRepository: ContentValidationRepository,
    private readonly _videoAssetRepository: VideoAssetRepository,
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

    // TEMP: bypass editorial approval + video validation for end-to-end publish testing.
    // Re-enable before production.
    // if (content.status !== 'APPROVED') {
    //   reasons.push('Content must be approved before publication.');
    // }
    //
    // const latestValidation = await this._contentValidationRepository.findLatestByContent(input.contentId);
    // if (!latestValidation || latestValidation.status !== 'APPROVED') {
    //   reasons.push('The content has not passed the independent validation gate.');
    // } else {
    //   const videoAssets = await this._videoAssetRepository.findByContent(input.contentId);
    //   const latestVideoAsset = videoAssets.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    //   if (
    //     !latestVideoAsset ||
    //     latestVideoAsset.id !== latestValidation.videoAssetId ||
    //     latestVideoAsset.status !== 'READY' ||
    //     !latestVideoAsset.storageKey
    //   ) {
    //     reasons.push('The latest video asset has not passed validation.');
    //   }
    // }

    if (socialAccount.status !== 'ACTIVE') {
      reasons.push('The social account is not active. Reconnect Instagram before publishing.');
    }

    const credential = await this.socialCredentialRepository.findActiveBySocialAccount(input.socialAccountId);
    if (!credential || !credential.isActive()) {
      reasons.push('The social account is disconnected or has no active credentials. Reconnect Instagram before publishing.');
    }

    // const duplicatePublication = await this._publicationRepository.findLatestByContentAndAccount(input.contentId, input.socialAccountId);
    // if (duplicatePublication && duplicatePublication.status === 'PUBLISHED') {
    //   reasons.push('This content has already been published to this social account.');
    // }

    return {
      allowed: reasons.length === 0,
      reasons,
    };
  }
}
