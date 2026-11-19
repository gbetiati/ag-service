import { ContentAsset } from './content-asset.entity.js';

export abstract class ContentAssetRepository {
  abstract create(asset: ContentAsset): Promise<ContentAsset>;
  abstract findByContent(contentId: string): Promise<ContentAsset[]>;
}
