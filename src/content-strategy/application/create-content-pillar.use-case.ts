import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { ContentPillar } from '../domain/content-pillar.entity.js';
import { ContentPillarRepository } from '../domain/content-pillar.repository.interface.js';

export type CreateContentPillarInput = {
  companyId: string;
  name: string;
  description?: string | null;
};

@Injectable()
export class CreateContentPillarUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly contentPillarRepository: ContentPillarRepository,
  ) {}

  async execute(input: CreateContentPillarInput): Promise<ContentPillar> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const existing = await this.contentPillarRepository.findByCompanyAndName(company.id, input.name.trim());
    if (existing) {
      throw new ConflictException('Content pillar already exists for this company.');
    }

    const pillar = ContentPillar.create({
      companyId: company.id,
      name: input.name.trim(),
      description: input.description ?? null,
    });

    return this.contentPillarRepository.create(pillar);
  }
}
