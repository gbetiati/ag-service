import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CreateCompanyUseCase } from './application/create-company.use-case.js';
import { GetCompaniesUseCase } from './application/get-companies.use-case.js';
import { CompanyController } from './infra/controllers/company.controller.js';
import { CompanyRepository } from './domain/company.repository.interface.js';
import { PrismaCompanyRepository } from './infra/repositories/prisma-company.repository.js';
import { IdentityModule } from '../identity/identity.module.js';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [CompanyController],
  providers: [
    CreateCompanyUseCase,
    GetCompaniesUseCase,
    {
      provide: CompanyRepository,
      useClass: PrismaCompanyRepository,
    },
  ],
  exports: [CompanyRepository],
})
export class CompaniesModule {}
