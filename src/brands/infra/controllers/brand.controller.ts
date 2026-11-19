import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateBrandDto } from '../dto/create-brand.dto.js';
import { CreateBrandUseCase } from '../../application/create-brand.use-case.js';
import { GetBrandsUseCase } from '../../application/get-brands.use-case.js';
import { Roles } from '../../../identity/infra/http/identity.decorators.js';

@Controller('companies/:companyId/brands')
export class BrandController {
  constructor(
    private readonly createBrandUseCase: CreateBrandUseCase,
    private readonly getBrandsUseCase: GetBrandsUseCase,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Param('companyId') companyId: string, @Body() body: CreateBrandDto) {
    return this.createBrandUseCase.execute({
      companyId,
      name: body.name,
      slug: body.slug,
      description: body.description,
    });
  }

  @Get()
  async findAll(@Param('companyId') companyId: string) {
    return this.getBrandsUseCase.execute({ companyId });
  }
}
