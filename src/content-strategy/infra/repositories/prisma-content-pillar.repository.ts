import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ContentPillar } from '../../domain/content-pillar.entity.js';
import { ContentPillarRepository } from '../../domain/content-pillar.repository.interface.js';

@Injectable()
export class PrismaContentPillarRepository extends ContentPillarRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(contentPillar: ContentPillar): Promise<ContentPillar> {
    const created = await this.prisma.contentPillar.create({
      data: {
        id: contentPillar.id,
        companyId: contentPillar.companyId,
        name: contentPillar.name,
        description: contentPillar.description,
        status: contentPillar.status,
      },
    });

    return ContentPillar.fromPersistence({
      id: created.id,
      companyId: created.companyId,
      name: created.name,
      description: created.description,
      status: created.status,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async findById(id: string): Promise<ContentPillar | null> {
    const item = await this.prisma.contentPillar.findUnique({ where: { id } });
    return item ? ContentPillar.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      name: item.name,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }) : null;
  }

  async findByCompany(companyId: string): Promise<ContentPillar[]> {
    const items = await this.prisma.contentPillar.findMany({ where: { companyId } });
    return items.map((item) => ContentPillar.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      name: item.name,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async findByCompanyAndName(companyId: string, name: string): Promise<ContentPillar | null> {
    const item = await this.prisma.contentPillar.findFirst({ where: { companyId, name } });
    return item ? ContentPillar.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      name: item.name,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }) : null;
  }
}
