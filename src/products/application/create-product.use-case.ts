import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '../domain/product.entity.js';
import { ProductRepository } from '../domain/product.repository.interface.js';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';

export type CreateProductInput = {
  companyId: string;
  name: string;
  slug: string;
  sku?: string | null;
  description?: string | null;
  priceCents?: number | null;
  brandId?: string | null;
  categoryId?: string | null;
};

@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const existing = await this.productRepository.findBySlug(company.id, input.slug);
    if (existing) {
      throw new ConflictException('Product slug already exists for this company.');
    }

    const product = Product.create({
      companyId: company.id,
      name: input.name,
      slug: input.slug,
      sku: input.sku ?? null,
      description: input.description ?? null,
      priceCents: input.priceCents ?? null,
      brandId: input.brandId ?? null,
      categoryId: input.categoryId ?? null,
    });

    return this.productRepository.create(product);
  }
}
