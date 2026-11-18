import { Publication } from './publication.entity.js';

export abstract class PublicationRepository {
  abstract create(publication: Publication): Promise<Publication>;
  abstract update(publication: Publication): Promise<Publication>;
  abstract completeScheduled(publication: Publication, scheduleId: string): Promise<Publication>;
  abstract findById(id: string): Promise<Publication | null>;
  abstract findByCompany(companyId: string): Promise<Publication[]>;
  abstract findByContent(contentId: string): Promise<Publication[]>;
  abstract findLatestByContentAndAccount(contentId: string, socialAccountId: string): Promise<Publication | null>;
}
