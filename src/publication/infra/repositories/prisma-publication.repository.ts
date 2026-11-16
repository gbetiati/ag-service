import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Publication } from '../../domain/publication.entity.js';
import { PublicationRepository } from '../../domain/publication.repository.interface.js';

@Injectable()
export class PrismaPublicationRepository extends PublicationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(publication: Publication): Promise<Publication> {
    const record = await this.prisma.publication.create({
      data: {
        id: publication.id,
        companyId: publication.companyId,
        contentId: publication.contentId,
        socialAccountId: publication.socialAccountId,
        status: publication.status,
        provider: publication.provider,
        scheduledFor: publication.scheduledFor,
        publishedAt: publication.publishedAt,
        externalPostId: publication.externalPostId,
        metadata: (publication.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: publication.errorMessage,
        createdAt: publication.createdAt,
        updatedAt: publication.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async update(publication: Publication): Promise<Publication> {
    const record = await this.prisma.publication.update({
      where: { id: publication.id },
      data: {
        status: publication.status,
        provider: publication.provider,
        scheduledFor: publication.scheduledFor,
        publishedAt: publication.publishedAt,
        externalPostId: publication.externalPostId,
        metadata: (publication.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: publication.errorMessage,
        updatedAt: publication.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async findById(id: string): Promise<Publication | null> {
    const record = await this.prisma.publication.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findByCompany(companyId: string): Promise<Publication[]> {
    const records = await this.prisma.publication.findMany({ where: { companyId } });
    return records.map((record) => this.toEntity(record));
  }

  async findByContent(contentId: string): Promise<Publication[]> {
    const records = await this.prisma.publication.findMany({ where: { contentId } });
    return records.map((record) => this.toEntity(record));
  }

  async findLatestByContentAndAccount(contentId: string, socialAccountId: string): Promise<Publication | null> {
    const records = await this.prisma.publication.findMany({
      where: { contentId, socialAccountId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return records[0] ? this.toEntity(records[0]) : null;
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    contentId: string;
    socialAccountId: string;
    status: string;
    provider: string;
    scheduledFor: Date | null;
    publishedAt: Date | null;
    externalPostId: string | null;
    metadata: Prisma.JsonValue | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Publication {
    return new Publication(
      record.id,
      record.companyId,
      record.contentId,
      record.socialAccountId,
      record.status as any,
      record.provider,
      record.scheduledFor,
      record.publishedAt,
      record.externalPostId,
      record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : record.metadata !== null
          ? ({ value: record.metadata } as Record<string, unknown>)
          : null,
      record.errorMessage,
      record.createdAt,
      record.updatedAt,
    );
  }
}
