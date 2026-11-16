import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ContentAsset } from '../../domain/content-asset.entity.js';
import { ContentAssetRepository } from '../../domain/content-asset.repository.interface.js';

@Injectable()
export class PrismaContentAssetRepository implements ContentAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(asset: ContentAsset): Promise<ContentAsset> {
    const created = await this.prisma.contentAsset.create({
      data: {
        id: asset.id,
        contentId: asset.contentId,
        mediaAssetId: asset.mediaAssetId,
        role: asset.role,
      },
    });

    return this.toEntity(created);
  }

  async findByContent(contentId: string): Promise<ContentAsset[]> {
    const records = await this.prisma.contentAsset.findMany({
      where: { contentId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map(record => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    contentId: string;
    mediaAssetId: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }): ContentAsset {
    return new ContentAsset(
      record.id,
      record.contentId,
      record.mediaAssetId,
      record.role,
      record.createdAt,
      record.updatedAt,
    );
  }
}
