import {
  Controller,
  Get,
  NotFoundException,
  Query,
  Res,
  UnauthorizedException,
  Param,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual, createHmac } from 'node:crypto';
import type { Response } from 'express';
import { StorageProvider } from '../../../storage/domain/storage-provider.interface.js';
import { MediaAssetRepository } from '../../domain/media-asset.repository.interface.js';
import { Public } from '../../../identity/infra/http/identity.decorators.js';

@Controller('media-assets')
export class PublicMediaAssetController {
  constructor(
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly storageProvider: StorageProvider,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get(':mediaAssetId/public')
  async get(
    @Param('mediaAssetId') mediaAssetId: string,
    @Query('expires') expiresParam: string,
    @Query('signature') signature: string,
    @Res() response: Response,
  ) {
    const expires = Number(expiresParam);
    const now = Math.floor(Date.now() / 1000);
    if (
      !Number.isSafeInteger(expires) ||
      expires <= now ||
      expires > now + 60 * 60
    ) {
      throw new UnauthorizedException('Media URL is expired or invalid.');
    }

    const secret = this.configService.getOrThrow<string>(
      'MEDIA_ASSET_URL_SECRET',
    );
    if (secret.length < 32 || !/^[a-f0-9]{64}$/i.test(signature ?? '')) {
      throw new UnauthorizedException('Media URL signature is invalid.');
    }
    const expected = createHmac('sha256', secret)
      .update(`${mediaAssetId}:${expires}`)
      .digest();
    const received = Buffer.from(signature, 'hex');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new UnauthorizedException('Media URL signature is invalid.');
    }

    const asset = await this.mediaAssetRepository.findById(mediaAssetId);
    if (
      !asset ||
      asset.kind !== 'IMAGE' ||
      !asset.mimeType.startsWith('image/')
    ) {
      throw new NotFoundException('Image asset not found.');
    }

    const image = await this.storageProvider.download(asset.storageKey);
    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', image.length);
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.send(image);
  }
}
