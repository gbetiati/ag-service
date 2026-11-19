import { Body, Controller, Param, Post } from '@nestjs/common';
import { CreateBrandRuleDto } from '../dto/create-brand-rule.dto.js';
import { CreateBrandRuleUseCase } from '../../application/create-brand-rule.use-case.js';
import { Roles } from '../../../identity/infra/http/identity.decorators.js';

@Controller('companies/:companyId/brands/:brandId/rules')
export class BrandRuleController {
  constructor(private readonly createBrandRuleUseCase: CreateBrandRuleUseCase) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Param('companyId') companyId: string, @Param('brandId') brandId: string, @Body() body: CreateBrandRuleDto) {
    return this.createBrandRuleUseCase.execute({
      companyId,
      brandId,
      title: body.title,
      ruleText: body.ruleText,
      isRequired: body.isRequired,
    });
  }
}
