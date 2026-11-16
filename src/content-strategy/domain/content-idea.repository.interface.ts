import { ContentIdea } from './content-idea.entity.js';

export abstract class ContentIdeaRepository {
  abstract create(contentIdea: ContentIdea): Promise<ContentIdea>;
  abstract findById(id: string): Promise<ContentIdea | null>;
  abstract findByCompany(companyId: string): Promise<ContentIdea[]>;
  abstract findByCompanyAndTitle(companyId: string, title: string): Promise<ContentIdea | null>;
  abstract findByPillar(pillarId: string): Promise<ContentIdea[]>;
}
