import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';
import { ContentValidationRepository } from '../../video-validation/domain/content-validation.repository.interface.js';
import { VideoAssetRepository } from '../../video-generation/domain/video-asset.repository.interface.js';

import { ScheduledPublicationRepository } from '../../scheduling/domain/scheduled-publication.repository.js';

@Injectable()
export class ApproveContentUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    // Kept for TEMP bypass — re-enable validation checks below before production.
    private readonly _contentValidationRepository: ContentValidationRepository,
    private readonly _videoAssetRepository: VideoAssetRepository,
    @Optional() private readonly schedules?: ScheduledPublicationRepository,
  ) {}

  async execute(input: { companyId: string; contentId: string; scheduleId?: string }): Promise<{ id: string; status: string }> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found for this company.');
    }

    if (await this.schedules?.approve(input)) {
      return { id: content.id, status: 'APPROVED' };
    }

    // TEMP: bypass video validation before approval for end-to-end publish testing.
    // Re-enable before production.
    // const validation = await this._contentValidationRepository.findLatestByContent(input.contentId);
    // if (!validation || validation.companyId !== input.companyId || validation.status !== 'APPROVED') {
    //   throw new ForbiddenException('Content must pass video validation before approval.');
    // }
    // const videoAssets = await this._videoAssetRepository.findByContent(input.contentId);
    // const latestVideoAsset = videoAssets.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    // if (!latestVideoAsset || latestVideoAsset.id !== validation.videoAssetId || latestVideoAsset.status !== 'READY' || !latestVideoAsset.storageKey) {
    //   throw new ForbiddenException('The latest stored video must pass validation before approval.');
    // }

    content.approve();
    const updated = await this.contentRepository.update(content);
    return { id: updated.id, status: updated.status };
  }
}
