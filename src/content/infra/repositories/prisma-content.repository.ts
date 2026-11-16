import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Content } from '../../domain/content.entity.js';
import { ContentRepository } from '../../domain/content.repository.interface.js';

@Injectable()
export class PrismaContentRepository implements ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(content: Content): Promise<Content> {
    const created = await this.prisma.content.create({
      data: {
        id: content.id,
        companyId: content.companyId,
        brandId: content.brandId,
        productId: content.productId,
        title: content.title,
        slug: content.slug,
        status: content.status,
        script: content.script,
        brief: content.brief,
        editorialMetadata: content.editorialMetadata as Prisma.InputJsonValue | undefined,
      },
    });

    return this.toEntity(created);
  }

  async update(content: Content): Promise<Content> {
    const updated = await this.prisma.content.update({
      where: { id: content.id },
      data: {
        title: content.title,
        slug: content.slug,
        status: content.status,
        script: content.script,
        brief: content.brief,
        editorialMetadata: content.editorialMetadata as Prisma.InputJsonValue | undefined,
      },
    });

    return this.toEntity(updated);
  }

  async findById(id: string): Promise<Content | null> {
    const record = await this.prisma.content.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findByCompany(companyId: string): Promise<Content[]> {
    const records = await this.prisma.content.findMany({ where: { companyId } });
    return records.map(record => this.toEntity(record));
  }

  async findBySlug(companyId: string, slug: string): Promise<Content | null> {
    const record = await this.prisma.content.findFirst({ where: { companyId, slug } });
    return record ? this.toEntity(record) : null;
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    brandId: string | null;
    productId: string | null;
    title: string;
    slug: string;
    status: string;
    script: string | null;
    brief: string | null;
    editorialMetadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): Content {
    return new Content(
      record.id,
      record.companyId,
      record.brandId,
      record.productId,
      record.title,
      record.slug,
      record.status as Content['status'],
      record.script,
      record.brief,
      (record.editorialMetadata ?? null) as Record<string, unknown> | null,
      null,
      record.createdAt,
      record.updatedAt,
    );
  }
}
