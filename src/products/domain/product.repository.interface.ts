import { Product } from './product.entity.js';

export abstract class ProductRepository {
  abstract create(product: Product): Promise<Product>;
  abstract findByCompany(companyId: string): Promise<Product[]>;
  abstract findById(id: string): Promise<Product | null>;
  abstract findBySlug(companyId: string, slug: string): Promise<Product | null>;
  abstract findByBrand(companyId: string, brandId: string): Promise<Product[]>;
}
