import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { ProductsModule } from '../products/products.module.js';
import { CheckContentSimilarityUseCase } from './application/check-content-similarity.use-case.js';
import { CreateContentPillarUseCase } from './application/create-content-pillar.use-case.js';
import { GenerateContentIdeasUseCase } from './application/generate-content-ideas.use-case.js';
import { PlanContentCalendarUseCase } from './application/plan-content-calendar.use-case.js';
import { SelectProductsForContentUseCase } from './application/select-products-for-content.use-case.js';
import { ContentCalendarRepository } from './domain/content-calendar.repository.interface.js';
import { ContentIdeaRepository } from './domain/content-idea.repository.interface.js';
import { ContentPillarRepository } from './domain/content-pillar.repository.interface.js';
import { ContentPlanRepository } from './domain/content-plan.repository.interface.js';
import { ContentStrategyAiService } from './domain/content-strategy-ai.service.interface.js';
import { ContentStrategyController } from './infra/controllers/content-strategy.controller.js';
import { PrismaContentCalendarRepository } from './infra/repositories/prisma-content-calendar.repository.js';
import { PrismaContentIdeaRepository } from './infra/repositories/prisma-content-idea.repository.js';
import { PrismaContentPillarRepository } from './infra/repositories/prisma-content-pillar.repository.js';
import { PrismaContentPlanRepository } from './infra/repositories/prisma-content-plan.repository.js';
import { LocalContentStrategyAiService } from './infra/services/local-content-strategy-ai.service.js';

@Module({
  imports: [PrismaModule, CompaniesModule, BrandsModule, ProductsModule],
  controllers: [ContentStrategyController],
  providers: [
    CreateContentPillarUseCase,
    GenerateContentIdeasUseCase,
    SelectProductsForContentUseCase,
    PlanContentCalendarUseCase,
    CheckContentSimilarityUseCase,
    {
      provide: ContentPillarRepository,
      useClass: PrismaContentPillarRepository,
    },
    {
      provide: ContentIdeaRepository,
      useClass: PrismaContentIdeaRepository,
    },
    {
      provide: ContentPlanRepository,
      useClass: PrismaContentPlanRepository,
    },
    {
      provide: ContentCalendarRepository,
      useClass: PrismaContentCalendarRepository,
    },
    {
      provide: ContentStrategyAiService,
      useClass: LocalContentStrategyAiService,
    },
  ],
  exports: [
    ContentPillarRepository,
    ContentIdeaRepository,
    ContentPlanRepository,
    ContentCalendarRepository,
    ContentStrategyAiService,
  ],
})
export class ContentStrategyModule {}
