import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { CreateProductCategoryUseCase } from './application/create-product-category.use-case.js';
import { CreateProductUseCase } from './application/create-product.use-case.js';
import { GetProductsUseCase } from './application/get-products.use-case.js';
import { ProductCategoryController } from './infra/controllers/product-category.controller.js';
import { ProductController } from './infra/controllers/product.controller.js';
import { ProductCategoryRepository } from './domain/product-category.repository.interface.js';
import { ProductRepository } from './domain/product.repository.interface.js';
import { PrismaProductCategoryRepository } from './infra/repositories/prisma-product-category.repository.js';
import { PrismaProductRepository } from './infra/repositories/prisma-product.repository.js';

@Module({
  imports: [PrismaModule, CompaniesModule],
  controllers: [ProductCategoryController, ProductController],
  providers: [
    CreateProductCategoryUseCase,
    CreateProductUseCase,
    GetProductsUseCase,
    {
      provide: ProductCategoryRepository,
      useClass: PrismaProductCategoryRepository,
    },
    {
      provide: ProductRepository,
      useClass: PrismaProductRepository,
    },
  ],
  exports: [ProductCategoryRepository, ProductRepository],
})
export class ProductsModule {}
