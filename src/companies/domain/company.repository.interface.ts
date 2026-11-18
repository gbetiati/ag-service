import { Company } from './company.entity.js';

export abstract class CompanyRepository {
  abstract create(company: Company): Promise<Company>;
  abstract update(company: Company): Promise<Company>;
  abstract findById(id: string): Promise<Company | null>;
  abstract findBySlug(slug: string): Promise<Company | null>;
  abstract findMany(): Promise<Company[]>;
}
