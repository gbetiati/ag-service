import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { CreateBrandUseCase } from './application/create-brand.use-case.js';
import { CreateBrandRuleUseCase } from './application/create-brand-rule.use-case.js';
import { GetBrandsUseCase } from './application/get-brands.use-case.js';
import { BrandController } from './infra/controllers/brand.controller.js';
import { BrandRuleController } from './infra/controllers/brand-rule.controller.js';
import { BrandRepository } from './domain/brand.repository.interface.js';
import { BrandRuleRepository } from './domain/brand-rule.repository.interface.js';
import { PrismaBrandRepository } from './infra/repositories/prisma-brand.repository.js';
import { PrismaBrandRuleRepository } from './infra/repositories/prisma-brand-rule.repository.js';

@Module({
  imports: [PrismaModule, CompaniesModule],
  controllers: [BrandController, BrandRuleController],
  providers: [
    CreateBrandUseCase,
    CreateBrandRuleUseCase,
    GetBrandsUseCase,
    {
      provide: BrandRepository,
      useClass: PrismaBrandRepository,
    },
    {
      provide: BrandRuleRepository,
      useClass: PrismaBrandRuleRepository,
    },
  ],
  exports: [BrandRepository, BrandRuleRepository],
})
export class BrandsModule {}
