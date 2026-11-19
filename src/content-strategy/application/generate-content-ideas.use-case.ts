import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { BrandRepository } from '../../brands/domain/brand.repository.interface.js';
import { ProductRepository } from '../../products/domain/product.repository.interface.js';
import { ContentIdea } from '../domain/content-idea.entity.js';
import { ContentIdeaRepository } from '../domain/content-idea.repository.interface.js';
import { ContentPillar } from '../domain/content-pillar.entity.js';
import { ContentPillarRepository } from '../domain/content-pillar.repository.interface.js';
import { ContentStrategyAiService } from '../domain/content-strategy-ai.service.interface.js';

export type GenerateContentIdeasInput = {
  companyId: string;
  brandId?: string | null;
  pillarId?: string | null;
  pillarName?: string | null;
  productIds?: string[];
  focus?: string | null;
  limit?: number;
};

@Injectable()
export class GenerateContentIdeasUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly brandRepository: BrandRepository,
    private readonly productRepository: ProductRepository,
    private readonly contentPillarRepository: ContentPillarRepository,
    private readonly contentIdeaRepository: ContentIdeaRepository,
    private readonly contentStrategyAiService: ContentStrategyAiService,
  ) {}

  async execute(input: GenerateContentIdeasInput): Promise<ContentIdea[]> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (input.brandId) {
      const brand = await this.brandRepository.findById(input.brandId);
      if (!brand || brand.companyId !== company.id) {
        throw new NotFoundException('Brand not found for this company');
      }
    }

    let pillar = null;
    if (input.pillarId) {
      pillar = await this.contentPillarRepository.findById(input.pillarId);
      if (!pillar || pillar.companyId !== company.id) {
        throw new NotFoundException('Content pillar not found for this company');
      }
    } else if (input.pillarName && input.pillarName.trim().length > 0) {
      pillar = await this.contentPillarRepository.findByCompanyAndName(company.id, input.pillarName.trim());
      if (!pillar) {
        pillar = await this.contentPillarRepository.create(
          ContentPillar.create({
            companyId: company.id,
            name: input.pillarName.trim(),
            description: `Auto-generated pillar to support ${input.focus ?? 'content planning'}`,
            status: 'ACTIVE',
          }),
        );
      }
    }

    const allProducts = input.productIds?.length
      ? await Promise.all(
          input.productIds.map(async (id) => {
            const product = await this.productRepository.findById(id);
            if (!product || product.companyId !== company.id) {
              throw new NotFoundException(`Product ${id} not found for this company`);
            }
            return product;
          }),
        )
      : input.brandId
        ? await this.productRepository.findByBrand(company.id, input.brandId)
        : await this.productRepository.findByCompany(company.id);

    if (allProducts.length === 0) {
      throw new NotFoundException('No products available to generate ideas for this company.');
    }

    const drafts = await this.contentStrategyAiService.generateIdeas({
      companyId: company.id,
      brandId: input.brandId ?? null,
      products: allProducts.map((product) => ({ id: product.id, name: product.name })),
      pillarName: pillar?.name ?? input.pillarName ?? 'General',
      focus: input.focus ?? 'brand awareness and conversion',
    });

    const ideas: ContentIdea[] = [];
    const limitedDrafts = drafts.slice(0, Math.max(1, input.limit ?? drafts.length));

    for (const draft of limitedDrafts) {
      const existing = await this.contentIdeaRepository.findByCompanyAndTitle(company.id, draft.title);
      if (existing) {
        ideas.push(existing);
        continue;
      }

      const created = ContentIdea.create({
        companyId: company.id,
        pillarId: pillar?.id ?? null,
        brandId: input.brandId ?? null,
        productId: allProducts[0]?.id ?? null,
        title: draft.title,
        summary: draft.summary,
        targetAudience: draft.targetAudience ?? null,
        angle: draft.angle ?? null,
      });

      ideas.push(await this.contentIdeaRepository.create(created));
    }

    return ideas;
  }
}
