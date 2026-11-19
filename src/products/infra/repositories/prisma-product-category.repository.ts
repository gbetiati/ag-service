import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ProductCategory } from '../../domain/product-category.entity.js';
import { ProductCategoryRepository } from '../../domain/product-category.repository.interface.js';

@Injectable()
export class PrismaProductCategoryRepository implements ProductCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(category: ProductCategory): Promise<ProductCategory> {
    const created = await this.prisma.productCategory.create({
      data: {
        id: category.id,
        companyId: category.companyId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
      },
    });

    return this.toEntity(created);
  }

  async findByCompany(companyId: string): Promise<ProductCategory[]> {
    const records = await this.prisma.productCategory.findMany({ where: { companyId } });
    return records.map(record => this.toEntity(record));
  }

  async findById(id: string): Promise<ProductCategory | null> {
    const record = await this.prisma.productCategory.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findBySlug(companyId: string, slug: string): Promise<ProductCategory | null> {
    const record = await this.prisma.productCategory.findFirst({ where: { companyId, slug } });
    return record ? this.toEntity(record) : null;
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProductCategory {
    return new ProductCategory(
      record.id,
      record.companyId,
      record.name,
      record.slug,
      record.description,
      record.parentId,
      record.createdAt,
      record.updatedAt,
    );
  }
}
