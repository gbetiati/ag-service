import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { VideoAsset } from '../../domain/video-asset.entity.js';
import { VideoAssetRepository } from '../../domain/video-asset.repository.interface.js';

@Injectable()
export class PrismaVideoAssetRepository extends VideoAssetRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(asset: VideoAsset): Promise<VideoAsset> {
    const stored = await this.prisma.videoAsset.create({
      data: {
        id: asset.id,
        companyId: asset.companyId,
        contentId: asset.contentId,
        provider: asset.provider,
        status: asset.status,
        renderJobId: asset.renderJobId,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        durationSeconds: asset.durationSeconds,
        metadata: (asset.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: asset.errorMessage,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      },
    });

    return this.mapEntity(stored);
  }

  async update(asset: VideoAsset): Promise<VideoAsset> {
    const updated = await this.prisma.videoAsset.update({
      where: { id: asset.id },
      data: {
        companyId: asset.companyId,
        contentId: asset.contentId,
        provider: asset.provider,
        status: asset.status,
        renderJobId: asset.renderJobId,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        durationSeconds: asset.durationSeconds,
        metadata: (asset.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: asset.errorMessage,
        updatedAt: asset.updatedAt,
      },
    });

    return this.mapEntity(updated);
  }

  async findById(id: string): Promise<VideoAsset | null> {
    const record = await this.prisma.videoAsset.findUnique({ where: { id } });
    return record ? this.mapEntity(record) : null;
  }

  async findByContent(contentId: string): Promise<VideoAsset[]> {
    const records = await this.prisma.videoAsset.findMany({ where: { contentId } });
    return records.map((record) => this.mapEntity(record));
  }

  async findByCompany(companyId: string): Promise<VideoAsset[]> {
    const records = await this.prisma.videoAsset.findMany({ where: { companyId } });
    return records.map((record) => this.mapEntity(record));
  }

  private mapEntity(record: {
    id: string;
    companyId: string;
    contentId: string;
    provider: string;
    status: string;
    renderJobId: string | null;
    storageKey: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    durationSeconds: number | null;
    metadata: Prisma.JsonValue | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): VideoAsset {
    return new VideoAsset(
      record.id,
      record.companyId,
      record.contentId,
      record.provider,
      record.status as any,
      record.renderJobId,
      record.storageKey,
      record.mimeType,
      record.sizeBytes,
      record.durationSeconds,
      this.normalizeMetadata(record.metadata),
      record.errorMessage,
      record.createdAt,
      record.updatedAt,
    );
  }

  private normalizeMetadata(metadata: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!metadata) {
      return null;
    }

    if (typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) {
      return metadata as Record<string, unknown>;
    }

    return { value: metadata };
  }
}
