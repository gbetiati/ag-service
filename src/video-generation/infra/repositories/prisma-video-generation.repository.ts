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

  async isScheduledRenderAllowed(id: string, companyId: string): Promise<boolean> {
    const record = await this.prisma.videoGeneration.findFirst({
      where: this.scheduledRenderScope(id, companyId),
      select: { id: true },
    });
    return !!record;
  }

  async claimScheduledSubmission(id: string, companyId: string): Promise<boolean> {
    const changed = await this.prisma.videoGeneration.updateMany({
      where: { ...this.scheduledRenderScope(id, companyId), status: 'QUEUED', renderJobId: null },
      data: { status: 'RENDERING', errorMessage: null },
    });
    return changed.count === 1;
  }

  private scheduledRenderScope(id: string, companyId: string): Prisma.VideoGenerationWhereInput {
    return {
      id, companyId,
      scheduledPublication: {
        id, companyId, stage: 'RENDER',
        content: { companyId, status: { notIn: ['REJECTED', 'ARCHIVED', 'PUBLISHED'] } },
        publication: {
          companyId, status: 'SCHEDULED', socialAccount: { companyId },
          company: { status: 'ACTIVE', automationStates: {
            none: { queueName: { in: ['video-generation', 'social-publishing'] }, paused: true },
          } },
        },
      },
    };
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
