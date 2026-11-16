import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brand } from '../domain/brand.entity.js';
import { BrandRepository } from '../domain/brand.repository.interface.js';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';

export type CreateBrandInput = {
  companyId: string;
  name: string;
  slug: string;
  description?: string | null;
};

@Injectable()
export class CreateBrandUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly brandRepository: BrandRepository,
  ) {}

  async execute(input: CreateBrandInput): Promise<Brand> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const existing = await this.brandRepository.findBySlug(company.id, input.slug);
    if (existing) {
      throw new ConflictException('Brand slug already exists for this company.');
    }

    const brand = Brand.create({
      companyId: company.id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
    });

    return this.brandRepository.create(brand);
  }
}
