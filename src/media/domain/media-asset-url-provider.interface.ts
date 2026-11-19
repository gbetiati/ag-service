import { MediaAsset } from './media-asset.entity.js';

export abstract class MediaAssetUrlProvider {
  abstract createUrl(asset: MediaAsset): string;
}
