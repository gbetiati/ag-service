import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { ProductsModule } from '../products/products.module.js';
import { CreateContentUseCase } from './application/create-content.use-case.js';
import { UpdateContentUseCase } from './application/update-content.use-case.js';
import { GetContentHistoryUseCase } from './application/get-content-history.use-case.js';
import { GetContentDetailsUseCase } from './application/get-content-details.use-case.js';
import { ContentController } from './infra/controllers/content.controller.js';
import { ContentRepository } from './domain/content.repository.interface.js';
import { ContentSceneRepository } from './domain/content-scene.repository.interface.js';
import { ContentAssetRepository } from './domain/content-asset.repository.interface.js';
import { ContentHistoryRepository } from './domain/content-history.repository.interface.js';
import { PrismaContentRepository } from './infra/repositories/prisma-content.repository.js';
import { PrismaContentSceneRepository } from './infra/repositories/prisma-content-scene.repository.js';
import { PrismaContentAssetRepository } from './infra/repositories/prisma-content-asset.repository.js';
import { PrismaContentHistoryRepository } from './infra/repositories/prisma-content-history.repository.js';

@Module({
  imports: [PrismaModule, CompaniesModule, BrandsModule, ProductsModule],
  controllers: [ContentController],
  providers: [
    CreateContentUseCase,
    UpdateContentUseCase,
    GetContentHistoryUseCase,
    GetContentDetailsUseCase,
    {
      provide: ContentRepository,
      useClass: PrismaContentRepository,
    },
    {
      provide: ContentSceneRepository,
      useClass: PrismaContentSceneRepository,
    },
    {
      provide: ContentAssetRepository,
      useClass: PrismaContentAssetRepository,
    },
    {
      provide: ContentHistoryRepository,
      useClass: PrismaContentHistoryRepository,
    },
  ],
  exports: [ContentRepository, ContentSceneRepository, ContentAssetRepository, ContentHistoryRepository],
})
export class ContentModule {}
