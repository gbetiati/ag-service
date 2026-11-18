import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { MediaAsset } from '../../domain/media-asset.entity.js';
import { MediaAssetUrlProvider } from '../../domain/media-asset-url-provider.interface.js';

const URL_TTL_SECONDS = 60 * 60;

@Injectable()
export class SignedMediaAssetUrlProvider extends MediaAssetUrlProvider {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  createUrl(asset: MediaAsset): string {
    const baseUrl = this.configService.getOrThrow<string>(
      'PUBLIC_API_BASE_URL',
    );
    const secret = this.configService.getOrThrow<string>(
      'MEDIA_ASSET_URL_SECRET',
    );
    if (secret.length < 32) {
      throw new Error(
        'MEDIA_ASSET_URL_SECRET must contain at least 32 characters.',
      );
    }

    const expires = Math.floor(Date.now() / 1000) + URL_TTL_SECONDS;
    const signature = this.sign(asset.id, expires, secret);
    const url = new URL(
      `/media-assets/${encodeURIComponent(asset.id)}/public`,
      baseUrl,
    );
    url.searchParams.set('expires', String(expires));
    url.searchParams.set('signature', signature);
    return url.toString();
  }

  private sign(assetId: string, expires: number, secret: string): string {
    return createHmac('sha256', secret)
      .update(`${assetId}:${expires}`)
      .digest('hex');
  }
}
