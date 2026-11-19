import { MediaAsset } from './media-asset.entity.js';

export abstract class MediaAssetRepository {
  abstract create(asset: MediaAsset): Promise<MediaAsset>;
  abstract findByProduct(companyId: string, productId: string): Promise<MediaAsset[]>;
  abstract findByCompany(companyId: string): Promise<MediaAsset[]>;
  abstract findById(id: string): Promise<MediaAsset | null>;
}
