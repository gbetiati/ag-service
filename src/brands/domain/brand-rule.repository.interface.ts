import { BrandRule } from './brand-rule.entity.js';

export abstract class BrandRuleRepository {
  abstract create(rule: BrandRule): Promise<BrandRule>;
  abstract findByBrand(companyId: string, brandId: string): Promise<BrandRule[]>;
}
