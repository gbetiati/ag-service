import { Injectable, NotFoundException } from '@nestjs/common';
import { VideoAsset } from '../domain/video-asset.entity.js';
import { VideoAssetRepository } from '../domain/video-asset.repository.interface.js';
import { VideoProvider } from '../domain/video-provider.interface.js';
import { StorageProvider } from '../../storage/domain/storage-provider.interface.js';

export type RenderVideoInput = {
  companyId: string;
  videoAssetId: string;
};

@Injectable()
export class RenderVideoUseCase {
  constructor(
    private readonly videoAssetRepository: VideoAssetRepository,
    private readonly videoProvider: VideoProvider,
    private readonly storageProvider: StorageProvider,
  ) {}

  async execute(input: RenderVideoInput): Promise<VideoAsset> {
    const asset = await this.videoAssetRepository.findById(input.videoAssetId);
    if (!asset || asset.companyId !== input.companyId) {
      throw new NotFoundException('Video asset not found in company');
    }

    if (!asset.renderJobId) {
      throw new NotFoundException('Video asset does not have a render job');
    }

    const renderStatus = await this.videoProvider.getRenderStatus(
      asset.renderJobId,
    );
    if (!renderStatus.renderJobId) {
      throw new NotFoundException('Video render job status unavailable');
    }

    const nextStatus =
      renderStatus.status === 'FAILED'
        ? 'FAILED'
        : renderStatus.status === 'READY'
          ? 'READY'
          : 'RENDERING';

    const mergedMetadata =
      asset.metadata && renderStatus.metadata
        ? { ...asset.metadata, ...renderStatus.metadata }
        : asset.metadata
          ? { ...asset.metadata }
          : renderStatus.metadata
            ? { ...renderStatus.metadata }
            : null;

    let nextAsset = new VideoAsset(
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

    if (renderStatus.status === 'READY') {
      const finalVideoStream = await this.videoProvider.fetchFinalVideo(
        asset.renderJobId,
      );
      const upload = await this.storageProvider.upload({
        stream: finalVideoStream,
        originalName: `${asset.id}.mp4`,
        mimeType: 'video/mp4',
        directory: 'videos',
      });
      if (upload.sizeBytes === 0) {
        await this.storageProvider.delete(upload.key);
        throw new Error('Creatomate returned an empty video file.');
      }
      const readyMetadata =
        asset.metadata && renderStatus.metadata
          ? {
              ...asset.metadata,
              ...renderStatus.metadata,
              storageUrl: upload.url,
            }
          : asset.metadata
            ? { ...asset.metadata, storageUrl: upload.url }
            : renderStatus.metadata
              ? { ...renderStatus.metadata, storageUrl: upload.url }
              : { storageUrl: upload.url };

      nextAsset = new VideoAsset(
        asset.id,
        asset.companyId,
        asset.contentId,
        asset.provider,
        'READY',
        asset.renderJobId,
        upload.key,
        upload.mimeType,
        upload.sizeBytes,
        asset.durationSeconds,
        readyMetadata,
        asset.errorMessage,
        asset.createdAt,
        new Date(),
      );
    }

    return this.videoAssetRepository.update(nextAsset);
  }
}
