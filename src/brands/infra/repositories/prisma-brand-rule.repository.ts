import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { BrandRule } from '../../domain/brand-rule.entity.js';
import { BrandRuleRepository } from '../../domain/brand-rule.repository.interface.js';

@Injectable()
export class PrismaBrandRuleRepository implements BrandRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(rule: BrandRule): Promise<BrandRule> {
    const created = await this.prisma.brandRule.create({
      data: {
        id: rule.id,
        companyId: rule.companyId,
        brandId: rule.brandId,
        title: rule.title,
        ruleText: rule.ruleText,
        isRequired: rule.isRequired,
      },
    });

    return this.toEntity(created);
  }

  async findByBrand(companyId: string, brandId: string): Promise<BrandRule[]> {
    const records = await this.prisma.brandRule.findMany({
      where: { companyId, brandId },
    });

    return records.map(record => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    brandId: string;
    title: string;
    ruleText: string;
    isRequired: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): BrandRule {
    return new BrandRule(
      record.id,
      record.companyId,
      record.brandId,
      record.title,
      record.ruleText,
      record.isRequired,
      record.createdAt,
      record.updatedAt,
    );
  }
}
