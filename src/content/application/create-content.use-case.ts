import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { ProductRepository } from '../../products/domain/product.repository.interface.js';
import { BrandRepository } from '../../brands/domain/brand.repository.interface.js';
import { Content } from '../domain/content.entity.js';
import { ContentHistory } from '../domain/content-history.entity.js';
import { ContentHistoryRepository } from '../domain/content-history.repository.interface.js';
import { ContentRepository } from '../domain/content.repository.interface.js';

export type CreateContentInput = {
  companyId: string;
  brandId?: string | null;
  productId?: string | null;
  title: string;
  slug: string;
  script?: string | null;
  brief?: string | null;
  editorialMetadata?: Record<string, unknown> | null;
};

@Injectable()
export class CreateContentUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly brandRepository: BrandRepository,
    private readonly productRepository: ProductRepository,
    private readonly contentRepository: ContentRepository,
    private readonly contentHistoryRepository: ContentHistoryRepository,
  ) {}

  async execute(input: CreateContentInput): Promise<Content> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (input.brandId) {
      const brand = await this.brandRepository.findById(input.brandId);
      if (!brand || brand.companyId !== company.id) {
        throw new NotFoundException('Brand not found in this company');
      }
    }

    if (input.productId) {
      const product = await this.productRepository.findById(input.productId);
      if (!product || product.companyId !== company.id) {
        throw new NotFoundException('Product not found in this company');
      }
    }

    const existing = await this.contentRepository.findBySlug(company.id, input.slug);
    if (existing) {
      throw new ConflictException('Content slug already exists for this company.');
    }

    const content = Content.create({
      companyId: company.id,
      brandId: input.brandId ?? null,
      productId: input.productId ?? null,
      title: input.title,
      slug: input.slug,
      script: input.script ?? null,
      brief: input.brief ?? null,
      editorialMetadata: input.editorialMetadata ?? null,
    });

    const created = await this.contentRepository.create(content);
    await this.contentHistoryRepository.create(
      new ContentHistory(
        crypto.randomUUID(),
        created.id,
        'created',
        null,
        {
          title: created.title,
          slug: created.slug,
          status: created.status,
        },
        new Date(),
      ),
    );

    return created;
  }
}
