import { Injectable, NotFoundException } from '@nestjs/common';
import { MediaAsset } from '../domain/media-asset.entity.js';
import { MediaAssetRepository } from '../domain/media-asset.repository.interface.js';
import { ProductRepository } from '../../products/domain/product.repository.interface.js';
import { StorageProvider } from '../../storage/domain/storage-provider.interface.js';

export type UploadedMediaFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type UploadMediaAssetInput = {
  companyId: string;
  productId: string;
  file: UploadedMediaFile;
  kind?: MediaAsset['kind'];
};

@Injectable()
export class UploadMediaAssetUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly storageProvider: StorageProvider,
  ) {}

  async execute(input: UploadMediaAssetInput): Promise<MediaAsset> {
    const product = await this.productRepository.findById(input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new NotFoundException('Product not found in company');
    }

    const uploaded = await this.storageProvider.upload({
      buffer: input.file.buffer,
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      directory: `companies/${input.companyId}/products/${input.productId}`,
    });

    const mediaAsset = new MediaAsset(
      crypto.randomUUID(),
      input.companyId,
      input.productId,
      (input.kind ?? 'IMAGE').toUpperCase() as MediaAsset['kind'],
      uploaded.key,
      input.file.originalname,
      uploaded.key,
      input.file.mimetype,
      input.file.size,
      null,
      null,
      {
        storageUrl: uploaded.url,
      },
      new Date(),
      new Date(),
    );

    return this.mediaAssetRepository.create(mediaAsset);
  }
}
