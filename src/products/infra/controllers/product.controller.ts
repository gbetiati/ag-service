import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto.js';
import { CreateProductUseCase } from '../../application/create-product.use-case.js';
import { GetProductsUseCase } from '../../application/get-products.use-case.js';
import { Roles } from '../../../identity/infra/http/identity.decorators.js';

@Controller('companies/:companyId/products')
export class ProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductsUseCase: GetProductsUseCase,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Param('companyId') companyId: string, @Body() body: CreateProductDto) {
    return this.createProductUseCase.execute({
      companyId,
      name: body.name,
      slug: body.slug,
      sku: body.sku,
      description: body.description,
      priceCents: body.priceCents,
      brandId: body.brandId,
      categoryId: body.categoryId,
    });
  }

  @Get()
  async findAll(@Param('companyId') companyId: string) {
    return this.getProductsUseCase.execute({ companyId });
  }
}
