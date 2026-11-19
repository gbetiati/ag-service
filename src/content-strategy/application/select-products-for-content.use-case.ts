import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { ProductRepository } from '../../products/domain/product.repository.interface.js';

export type SelectProductsForContentInput = {
  companyId: string;
  brandId?: string | null;
  goal?: string | null;
  limit?: number;
};

@Injectable()
export class SelectProductsForContentUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(input: SelectProductsForContentInput) {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const products = input.brandId
      ? await this.productRepository.findByBrand(company.id, input.brandId)
      : await this.productRepository.findByCompany(company.id);

    if (products.length === 0) {
      throw new NotFoundException('No active products are available for strategy selection');
    }

    const goal = (input.goal ?? '').toLowerCase();
    const scored = products
      .map((product) => {
        const productText = `${product.name} ${product.description ?? ''}`.toLowerCase();
        const keywordBoost = goal.length > 0 && productText.includes(goal) ? 30 : 0;
        const priceBoost = product.priceCents ? Math.min(20, Math.round(product.priceCents / 1000)) : 0;
        const brandBoost = product.brandId === input.brandId ? 25 : 0;
        return {
          product,
          score: keywordBoost + priceBoost + brandBoost + 15,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, input.limit ?? 5));

    return scored.map(({ product, score }) => ({
      productId: product.id,
      name: product.name,
      score,
    }));
  }
}
