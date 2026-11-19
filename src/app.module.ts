import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CompaniesModule } from './companies/companies.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { ProductsModule } from './products/products.module.js';
import { MediaModule } from './media/media.module.js';
import { ContentModule } from './content/content.module.js';
import { VideoGenerationModule } from './video-generation/video-generation.module.js';
import { VideoValidationModule } from './video-validation/video-validation.module.js';
import { PublicationModule } from './publication/publication.module.js';
import { SchedulingModule } from './scheduling/scheduling.module.js';
import { ContentStrategyModule } from './content-strategy/content-strategy.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { IdentityModule } from './identity/identity.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    IdentityModule,
    CompaniesModule,
    BrandsModule,
    ProductsModule,
    MediaModule,
    ContentModule,
    VideoGenerationModule,
    VideoValidationModule,
    PublicationModule,
    SchedulingModule,
    ContentStrategyModule,
    OperationsModule,
  ],
})
export class AppModule {}
