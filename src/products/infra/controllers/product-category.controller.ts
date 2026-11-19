import { Body, Controller, Param, Post } from '@nestjs/common';
import { CreateProductCategoryDto } from '../dto/create-product-category.dto.js';
import { CreateProductCategoryUseCase } from '../../application/create-product-category.use-case.js';
import { Roles } from '../../../identity/infra/http/identity.decorators.js';

@Controller('companies/:companyId/categories')
export class ProductCategoryController {
  constructor(private readonly createProductCategoryUseCase: CreateProductCategoryUseCase) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Param('companyId') companyId: string, @Body() body: CreateProductCategoryDto) {
    return this.createProductCategoryUseCase.execute({
      companyId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      parentId: body.parentId,
    });
  }
}
