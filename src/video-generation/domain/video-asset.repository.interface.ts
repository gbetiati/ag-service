import { VideoAsset } from './video-asset.entity.js';

export abstract class VideoAssetRepository {
  abstract create(asset: VideoAsset): Promise<VideoAsset>;
  abstract update(asset: VideoAsset): Promise<VideoAsset>;
  abstract findById(id: string): Promise<VideoAsset | null>;
  abstract findByContent(contentId: string): Promise<VideoAsset[]>;
  abstract findByCompany(companyId: string): Promise<VideoAsset[]>;
}
