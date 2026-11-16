import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../domain/product.repository.interface.js';
import { Product } from '../domain/product.entity.js';

export type GetProductsInput = {
  companyId: string;
};

@Injectable()
export class GetProductsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: GetProductsInput): Promise<Product[]> {
    return this.productRepository.findByCompany(input.companyId);
  }
}
