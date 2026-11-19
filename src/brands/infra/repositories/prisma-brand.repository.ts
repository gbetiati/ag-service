import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Brand } from '../../domain/brand.entity.js';
import { BrandRepository } from '../../domain/brand.repository.interface.js';

@Injectable()
export class PrismaBrandRepository implements BrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(brand: Brand): Promise<Brand> {
    const created = await this.prisma.brand.create({
      data: {
        id: brand.id,
        companyId: brand.companyId,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        status: brand.status,
      },
    });

    return this.toEntity(created);
  }

  async findById(id: string): Promise<Brand | null> {
    const record = await this.prisma.brand.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findByCompany(companyId: string): Promise<Brand[]> {
    const records = await this.prisma.brand.findMany({ where: { companyId } });
    return records.map(record => this.toEntity(record));
  }

  async findBySlug(companyId: string, slug: string): Promise<Brand | null> {
    const record = await this.prisma.brand.findFirst({ where: { companyId, slug } });
    return record ? this.toEntity(record) : null;
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Brand {
    return new Brand(
      record.id,
      record.companyId,
      record.name,
      record.slug,
      record.description,
      record.status as Brand['status'],
      record.createdAt,
      record.updatedAt,
    );
  }
}
