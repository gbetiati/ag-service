import { Body, Controller, Get, Param, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateCompanyDto } from '../dto/create-company.dto.js';
import { CreateCompanyUseCase } from '../../application/create-company.use-case.js';
import { GetCompaniesUseCase } from '../../application/get-companies.use-case.js';
import { UpdateCompanyApprovalModeUseCase } from '../../application/update-company-approval-mode.use-case.js';
import { UpdateCompanyApprovalModeDto } from '../dto/update-company-approval-mode.dto.js';
import { CurrentIdentity, Roles } from '../../../identity/infra/http/identity.decorators.js';
import type { RequestIdentity } from '../../../identity/infra/http/identity-request.js';

@Controller('companies')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
export class CompanyController {
  constructor(
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly getCompaniesUseCase: GetCompaniesUseCase,
    private readonly updateCompanyApprovalMode: UpdateCompanyApprovalModeUseCase,
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

  @Patch(':companyId/approval-mode')
  @Roles('OWNER', 'ADMIN')
  updateApprovalMode(@Param('companyId') companyId: string, @Body() body: UpdateCompanyApprovalModeDto) {
    return this.updateCompanyApprovalMode.execute({ companyId, approvalMode: body.approvalMode });
  }
}
