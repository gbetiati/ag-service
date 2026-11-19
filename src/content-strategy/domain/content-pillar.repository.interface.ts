import { ContentPillar } from './content-pillar.entity.js';

export abstract class ContentPillarRepository {
  abstract create(contentPillar: ContentPillar): Promise<ContentPillar>;
  abstract findById(id: string): Promise<ContentPillar | null>;
  abstract findByCompany(companyId: string): Promise<ContentPillar[]>;
  abstract findByCompanyAndName(companyId: string, name: string): Promise<ContentPillar | null>;
}
