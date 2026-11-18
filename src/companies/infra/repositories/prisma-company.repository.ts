import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Company } from '../../domain/company.entity.js';
import { CompanyRepository } from '../../domain/company.repository.interface.js';

@Injectable()
export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(company: Company): Promise<Company> {
    const created = await this.prisma.company.create({
      data: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        description: company.description,
        status: company.status,
        approvalMode: company.approvalMode,
      },
    });

    return new Company(
      created.id,
      created.name,
      created.slug,
      created.description,
      created.status as Company['status'],
      created.createdAt,
      created.updatedAt,
      created.approvalMode,
    );
  }

  async update(company: Company): Promise<Company> {
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: {
        approvalMode: company.approvalMode,
      },
    });
    return this.toEntity(updated);
  }

  async findById(id: string): Promise<Company | null> {
    const record = await this.prisma.company.findUnique({ where: { id } });
    if (!record) {
      return null;
    }

    return this.toEntity(record);
  }

  async findBySlug(slug: string): Promise<Company | null> {
    const record = await this.prisma.company.findUnique({ where: { slug } });
    if (!record) {
      return null;
    }

    return this.toEntity(record);
  }

  async findMany(): Promise<Company[]> {
    const records = await this.prisma.company.findMany();
    return records.map(record => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    approvalMode: string;
    createdAt: Date;
    updatedAt: Date;
  }): Company {
    return new Company(
      record.id,
      record.name,
      record.slug,
      record.description,
      record.status as Company['status'],
      record.createdAt,
      record.updatedAt,
      record.approvalMode as Company['approvalMode'],
    );
  }
}
