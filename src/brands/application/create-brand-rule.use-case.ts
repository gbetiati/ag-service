import { Injectable, NotFoundException } from '@nestjs/common';
import { BrandRule } from '../domain/brand-rule.entity.js';
import { BrandRuleRepository } from '../domain/brand-rule.repository.interface.js';
import { BrandRepository } from '../domain/brand.repository.interface.js';

export type CreateBrandRuleInput = {
  companyId: string;
  brandId: string;
  title: string;
  ruleText: string;
  isRequired?: boolean;
};

@Injectable()
export class CreateBrandRuleUseCase {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly brandRuleRepository: BrandRuleRepository,
  ) {}

  async execute(input: CreateBrandRuleInput): Promise<BrandRule> {
    const existingBrand = await this.brandRepository.findById(input.brandId);
    if (!existingBrand || existingBrand.companyId !== input.companyId) {
      throw new NotFoundException('Brand not found for company');
    }

    const rule = BrandRule.create({
      companyId: input.companyId,
      brandId: input.brandId,
      title: input.title,
      ruleText: input.ruleText,
      isRequired: input.isRequired ?? true,
    });

    return this.brandRuleRepository.create(rule);
  }
}
