import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateCompanyDto } from '../dto/create-company.dto.js';
import { CreateCompanyUseCase } from '../../application/create-company.use-case.js';
import { GetCompaniesUseCase } from '../../application/get-companies.use-case.js';
import { CurrentIdentity } from '../../../identity/infra/http/identity.decorators.js';
import type { RequestIdentity } from '../../../identity/infra/http/identity-request.js';

@Controller('companies')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
export class CompanyController {
  constructor(
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly getCompaniesUseCase: GetCompaniesUseCase,
  ) {}

  @Post()
  async create(@Body() body: CreateCompanyDto, @CurrentIdentity() identity: RequestIdentity) {
    return this.createCompanyUseCase.execute({
      userId: identity.userId,
      name: body.name,
      slug: body.slug,
      description: body.description,
    });
  }

  @Get()
  async findAll(@CurrentIdentity() identity: RequestIdentity) {
    return this.getCompaniesUseCase.execute(identity.userId);
  }
}
