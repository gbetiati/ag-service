import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';
import { ContentAssetRepository } from '../../content/domain/content-asset.repository.interface.js';
import { MediaAssetRepository } from '../../media/domain/media-asset.repository.interface.js';
import { MediaAssetUrlProvider } from '../../media/domain/media-asset-url-provider.interface.js';
import { VideoAssetRepository } from '../../video-generation/domain/video-asset.repository.interface.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';
import { SocialCredentialRepository } from '../domain/social-credential.repository.interface.js';
import { PublicationAttemptRepository } from '../domain/publication-attempt.repository.interface.js';
import { PublicationRepository } from '../domain/publication.repository.interface.js';
import { PublicationGateService } from '../domain/publication-gate.service.interface.js';
import { SocialPublisher, SocialPublishMediaType } from '../domain/social-publisher.interface.js';
import { Publication } from '../domain/publication.entity.js';
import { PublicationAttempt } from '../domain/publication-attempt.entity.js';

export type PublishContentInput = {
  companyId: string;
  contentId: string;
  socialAccountId: string;
  scheduleId?: string;
  videoAssetId?: string;
};

@Injectable()
export class PublishContentUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly contentAssetRepository: ContentAssetRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly mediaAssetUrlProvider: MediaAssetUrlProvider,
    private readonly videoAssetRepository: VideoAssetRepository,
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

    let publication = await this.publicationRepository.findLatestByContentAndAccount(input.contentId, input.socialAccountId);
    if (publication?.status === 'PUBLISHED') {
      return publication;
    }

    const gate = await this.publicationGateService.authorize({
      companyId: input.companyId,
      contentId: input.contentId,
      socialAccountId: input.socialAccountId,
      ...(input.scheduleId ? { scheduleId: input.scheduleId, videoAssetId: input.videoAssetId } : {}),
    });

    if (!gate.allowed) {
      throw new UnauthorizedException(gate.reasons.join('; '));
    }

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

    const media = await this.resolvePublishMedia(input.contentId, input.videoAssetId);
    if (input.scheduleId) {
      if (!media?.url.startsWith('https://') || credential.companyId !== input.companyId) {
        throw new UnauthorizedException('The scheduled video or account credential is unavailable.');
      }
      const decision = await this.publicationGateService.authorize(input);
      if (!decision.allowed) throw new UnauthorizedException(decision.reasons.join(' | '));
    }
    const result = await this.socialPublisher.publish({
      companyId: input.companyId,
      contentId: input.contentId,
      publication,
      socialAccount,
      credential,
      caption: content.script ?? content.title,
      mediaUrl: media?.url ?? null,
      mediaType: media?.mediaType,
    });

    publication.markPublished(result.externalPostId, result.metadata ?? null);
    if (input.scheduleId) {
      return this.publicationRepository.completeScheduled(publication, input.scheduleId);
    }
    publication = await this.publicationRepository.update(publication);

    const previousAttempts = await this.publicationAttemptRepository.findByPublication(publication.id);
    const attempt = PublicationAttempt.create({
      publicationId: publication.id,
      attemptNumber: previousAttempts.reduce((max, previous) => Math.max(max, previous.attemptNumber), 0) + 1,
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

  private async resolvePublishMedia(
    contentId: string,
    requiredVideoId?: string,
  ): Promise<{ url: string; mediaType: SocialPublishMediaType } | null> {
    const videoAssets = await this.videoAssetRepository.findByContent(contentId);
    const readyVideo = videoAssets
      .filter((asset) => asset.status === 'READY' && (!requiredVideoId || asset.id === requiredVideoId))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

    const videoUrl =
      readyVideo?.metadata && typeof readyVideo.metadata.storageUrl === 'string'
        ? readyVideo.metadata.storageUrl
        : null;
    if (videoUrl) {
      return { url: videoUrl, mediaType: 'REELS' };
    }

    if (requiredVideoId) return null;

    const contentAssets = await this.contentAssetRepository.findByContent(contentId);
    for (const contentAsset of contentAssets) {
      if (!contentAsset.mediaAssetId) {
        continue;
      }
      const mediaAsset = await this.mediaAssetRepository.findById(contentAsset.mediaAssetId);
      if (!mediaAsset) {
        continue;
      }
      const url =
        mediaAsset.metadata && typeof mediaAsset.metadata.storageUrl === 'string'
          ? mediaAsset.metadata.storageUrl
          : this.mediaAssetUrlProvider.createUrl(mediaAsset);
      const mediaType: SocialPublishMediaType =
        mediaAsset.kind === 'VIDEO' || mediaAsset.mimeType.toLowerCase().startsWith('video/')
          ? 'REELS'
          : 'IMAGE';
      return { url, mediaType };
    }

    return null;
  }
}
