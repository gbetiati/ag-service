import { Content } from './content.entity.js';

export abstract class ContentRepository {
  abstract create(content: Content): Promise<Content>;
  abstract update(content: Content): Promise<Content>;
  abstract findById(id: string): Promise<Content | null>;
  abstract findByCompany(companyId: string): Promise<Content[]>;
  abstract findBySlug(companyId: string, slug: string): Promise<Content | null>;
}
