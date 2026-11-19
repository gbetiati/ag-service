import { ProductCategory } from './product-category.entity.js';

export abstract class ProductCategoryRepository {
  abstract create(category: ProductCategory): Promise<ProductCategory>;
  abstract findByCompany(companyId: string): Promise<ProductCategory[]>;
  abstract findById(id: string): Promise<ProductCategory | null>;
  abstract findBySlug(companyId: string, slug: string): Promise<ProductCategory | null>;
}
