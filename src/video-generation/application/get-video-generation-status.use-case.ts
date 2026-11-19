import { Injectable, NotFoundException } from '@nestjs/common';
import { VideoAsset } from '../domain/video-asset.entity.js';
import { VideoAssetRepository } from '../domain/video-asset.repository.interface.js';
import { VideoProvider } from '../domain/video-provider.interface.js';

export type GetVideoGenerationStatusInput = {
  companyId: string;
  videoAssetId: string;
};

@Injectable()
export class GetVideoGenerationStatusUseCase {
  constructor(
    private readonly videoAssetRepository: VideoAssetRepository,
    private readonly videoProvider: VideoProvider,
  ) {}

  async execute(input: GetVideoGenerationStatusInput): Promise<VideoAsset> {
    const asset = await this.videoAssetRepository.findById(input.videoAssetId);
    if (!asset || asset.companyId !== input.companyId) {
      throw new NotFoundException('Video asset not found in company');
    }

    if (!asset.renderJobId) {
      return asset;
    }

    const renderStatus = await this.videoProvider.getRenderStatus(asset.renderJobId);
    const nextStatus = renderStatus.status === 'FAILED' ? 'FAILED' : renderStatus.status === 'READY' ? 'READY' : 'RENDERING';

    const mergedMetadata = asset.metadata && renderStatus.metadata
      ? { ...asset.metadata, ...renderStatus.metadata }
      : asset.metadata
        ? { ...asset.metadata }
        : renderStatus.metadata
          ? { ...renderStatus.metadata }
          : null;

    const updatedAsset = new VideoAsset(
      asset.id,
      asset.companyId,
      asset.contentId,
      asset.provider,
      nextStatus,
      asset.renderJobId,
      asset.storageKey,
      asset.mimeType,
      asset.sizeBytes,
      asset.durationSeconds,
      mergedMetadata,
      renderStatus.errorMessage ?? asset.errorMessage,
      asset.createdAt,
      new Date(),
    );

    return this.videoAssetRepository.update(updatedAsset);
  }
}
