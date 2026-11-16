import { Injectable } from '@nestjs/common';
import { BrandRepository } from '../domain/brand.repository.interface.js';
import { Brand } from '../domain/brand.entity.js';

export type GetBrandsInput = {
  companyId: string;
};

@Injectable()
export class GetBrandsUseCase {
  constructor(private readonly brandRepository: BrandRepository) {}

  async execute(input: GetBrandsInput): Promise<Brand[]> {
    return this.brandRepository.findByCompany(input.companyId);
  }
}
