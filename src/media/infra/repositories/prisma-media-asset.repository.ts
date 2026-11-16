import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { MediaAsset } from '../../domain/media-asset.entity.js';
import { MediaAssetRepository } from '../../domain/media-asset.repository.interface.js';

@Injectable()
export class PrismaMediaAssetRepository implements MediaAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(asset: MediaAsset): Promise<MediaAsset> {
    const created = await this.prisma.mediaAsset.create({
      data: {
        id: asset.id,
        companyId: asset.companyId,
        productId: asset.productId,
        kind: asset.kind,
        fileName: asset.fileName,
        originalName: asset.originalName,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        metadata: asset.metadata ? (asset.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    return this.toEntity(created);
  }

  async findByProduct(companyId: string, productId: string): Promise<MediaAsset[]> {
    const records = await this.prisma.mediaAsset.findMany({
      where: { companyId, productId },
    });

    return records.map(record => this.toEntity(record));
  }

  async findByCompany(companyId: string): Promise<MediaAsset[]> {
    const records = await this.prisma.mediaAsset.findMany({ where: { companyId } });
    return records.map(record => this.toEntity(record));
  }

  async findById(id: string): Promise<MediaAsset | null> {
    const record = await this.prisma.mediaAsset.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    productId: string | null;
    kind: string;
    fileName: string;
    originalName: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): MediaAsset {
    return new MediaAsset(
      record.id,
      record.companyId,
      record.productId,
      record.kind as MediaAsset['kind'],
      record.fileName,
      record.originalName,
      record.storageKey,
      record.mimeType,
      record.sizeBytes,
      record.width,
      record.height,
      (record.metadata ?? null) as Record<string, unknown> | null,
      record.createdAt,
      record.updatedAt,
    );
  }
}
