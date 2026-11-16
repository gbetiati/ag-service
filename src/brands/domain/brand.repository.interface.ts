import { Brand } from './brand.entity.js';

export abstract class BrandRepository {
  abstract create(brand: Brand): Promise<Brand>;
  abstract findById(id: string): Promise<Brand | null>;
  abstract findByCompany(companyId: string): Promise<Brand[]>;
  abstract findBySlug(companyId: string, slug: string): Promise<Brand | null>;
}
