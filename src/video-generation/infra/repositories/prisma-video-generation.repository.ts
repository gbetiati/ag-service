import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { VideoGeneration } from '../../domain/video-generation.entity.js';
import { VideoGenerationRepository } from '../../domain/video-generation.repository.interface.js';

@Injectable()
export class PrismaVideoGenerationRepository extends VideoGenerationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(generation: VideoGeneration): Promise<VideoGeneration> {
    const record = await this.prisma.videoGeneration.create({
      data: {
        id: generation.id,
        companyId: generation.companyId,
        contentId: generation.contentId,
        provider: generation.provider,
        status: generation.status,
        renderJobId: generation.renderJobId,
        videoAssetId: generation.videoAssetId,
        request: generation.request as Prisma.InputJsonValue,
        errorMessage: generation.errorMessage,
      },
    });
    return this.toEntity(record);
  }

  async update(generation: VideoGeneration): Promise<VideoGeneration> {
    const record = await this.prisma.videoGeneration.update({
      where: { id: generation.id },
      data: {
        status: generation.status,
        renderJobId: generation.renderJobId,
        videoAssetId: generation.videoAssetId,
        request: generation.request as Prisma.InputJsonValue,
        errorMessage: generation.errorMessage,
        updatedAt: new Date(),
      },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<VideoGeneration | null> {
    const record = await this.prisma.videoGeneration.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findByCompany(companyId: string): Promise<VideoGeneration[]> {
    const records = await this.prisma.videoGeneration.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    contentId: string;
    provider: string;
    status: string;
    renderJobId: string | null;
    videoAssetId: string | null;
    request: Prisma.JsonValue;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): VideoGeneration {
    const request =
      typeof record.request === 'object' && record.request !== null && !Array.isArray(record.request)
        ? (record.request as Record<string, unknown>)
        : {};
    return new VideoGeneration(
      record.id,
      record.companyId,
      record.contentId,
      record.provider,
      record.status as VideoGeneration['status'],
      record.renderJobId,
      record.videoAssetId,
      request,
      record.errorMessage,
      record.createdAt,
      record.updatedAt,
    );
  }
}
