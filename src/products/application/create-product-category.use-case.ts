import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductCategory } from '../domain/product-category.entity.js';
import { ProductCategoryRepository } from '../domain/product-category.repository.interface.js';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';

export type CreateProductCategoryInput = {
  companyId: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
};

@Injectable()
export class CreateProductCategoryUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly categoryRepository: ProductCategoryRepository,
  ) {}

  async execute(input: CreateProductCategoryInput): Promise<ProductCategory> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const existing = await this.categoryRepository.findBySlug(company.id, input.slug);
    if (existing) {
      throw new ConflictException('Category slug already exists for this company.');
    }

    const category = ProductCategory.create({
      companyId: company.id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
    });

    return this.categoryRepository.create(category);
  }
}
