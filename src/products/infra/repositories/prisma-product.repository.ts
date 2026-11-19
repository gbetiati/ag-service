import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Product } from '../../domain/product.entity.js';
import { ProductRepository } from '../../domain/product.repository.interface.js';

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(product: Product): Promise<Product> {
    const created = await this.prisma.product.create({
      data: {
        id: product.id,
        companyId: product.companyId,
        brandId: product.brandId,
        categoryId: product.categoryId,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        priceCents: product.priceCents,
        status: product.status,
      },
    });

    return this.toEntity(created);
  }

  async findByCompany(companyId: string): Promise<Product[]> {
    const records = await this.prisma.product.findMany({ where: { companyId } });
    return records.map(record => this.toEntity(record));
  }

  async findById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findBySlug(companyId: string, slug: string): Promise<Product | null> {
    const record = await this.prisma.product.findFirst({ where: { companyId, slug } });
    return record ? this.toEntity(record) : null;
  }

  async findByBrand(companyId: string, brandId: string): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: { companyId, brandId },
    });

    return records.map(record => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    name: string;
    slug: string;
    sku: string | null;
    description: string | null;
    priceCents: number | null;
    status: string;
    brandId: string | null;
    categoryId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Product {
    return new Product(
      record.id,
      record.companyId,
      record.name,
      record.slug,
      record.sku,
      record.description,
      record.priceCents,
      record.status as Product['status'],
      record.brandId,
      record.categoryId,
      record.createdAt,
      record.updatedAt,
    );
  }
}
