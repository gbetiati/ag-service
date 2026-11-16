import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ContentIdea } from '../../domain/content-idea.entity.js';
import { ContentIdeaRepository } from '../../domain/content-idea.repository.interface.js';

@Injectable()
export class PrismaContentIdeaRepository extends ContentIdeaRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(contentIdea: ContentIdea): Promise<ContentIdea> {
    const created = (await this.prisma.contentIdea.create({
      data: {
        id: contentIdea.id,
        companyId: contentIdea.companyId,
        pillarId: contentIdea.pillarId,
        brandId: contentIdea.brandId,
        productId: contentIdea.productId,
        title: contentIdea.title,
        summary: contentIdea.summary,
        targetAudience: contentIdea.targetAudience,
        angle: contentIdea.angle,
        status: contentIdea.status,
        embedding: contentIdea.embedding as any,
      },
    })) as any;

    return ContentIdea.fromPersistence({
      id: created.id,
      companyId: created.companyId,
      pillarId: created.pillarId,
      brandId: created.brandId,
      productId: created.productId,
      title: created.title,
      summary: created.summary,
      targetAudience: created.targetAudience,
      angle: created.angle,
      status: created.status,
      embedding: (created.embedding as number[] | null) ?? null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async findById(id: string): Promise<ContentIdea | null> {
    const item = (await this.prisma.contentIdea.findUnique({ where: { id } })) as any;
    return item ? ContentIdea.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      pillarId: item.pillarId,
      brandId: item.brandId,
      productId: item.productId,
      title: item.title,
      summary: item.summary,
      targetAudience: item.targetAudience,
      angle: item.angle,
      status: item.status,
      embedding: (item.embedding as number[] | null) ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }) : null;
  }

  async findByCompany(companyId: string): Promise<ContentIdea[]> {
    const items = (await this.prisma.contentIdea.findMany({ where: { companyId } })) as any[];
    return items.map((item) => ContentIdea.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      pillarId: item.pillarId,
      brandId: item.brandId,
      productId: item.productId,
      title: item.title,
      summary: item.summary,
      targetAudience: item.targetAudience,
      angle: item.angle,
      status: item.status,
      embedding: (item.embedding as number[] | null) ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async findByCompanyAndTitle(companyId: string, title: string): Promise<ContentIdea | null> {
    const item = (await this.prisma.contentIdea.findFirst({ where: { companyId, title } })) as any;
    return item ? ContentIdea.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      pillarId: item.pillarId,
      brandId: item.brandId,
      productId: item.productId,
      title: item.title,
      summary: item.summary,
      targetAudience: item.targetAudience,
      angle: item.angle,
      status: item.status,
      embedding: (item.embedding as number[] | null) ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }) : null;
  }

  async findByPillar(pillarId: string): Promise<ContentIdea[]> {
    const items = (await this.prisma.contentIdea.findMany({ where: { pillarId } })) as any[];
    return items.map((item) => ContentIdea.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      pillarId: item.pillarId,
      brandId: item.brandId,
      productId: item.productId,
      title: item.title,
      summary: item.summary,
      targetAudience: item.targetAudience,
      angle: item.angle,
      status: item.status,
      embedding: (item.embedding as number[] | null) ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }
}
