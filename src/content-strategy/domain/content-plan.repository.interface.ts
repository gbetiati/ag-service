import { ContentPlan } from './content-plan.entity.js';

export abstract class ContentPlanRepository {
  abstract create(contentPlan: ContentPlan): Promise<ContentPlan>;
  abstract update(contentPlan: ContentPlan): Promise<ContentPlan>;
  abstract findById(id: string): Promise<ContentPlan | null>;
  abstract findByCompany(companyId: string): Promise<ContentPlan[]>;
  abstract findByCompanyAndStatus(companyId: string, status: string): Promise<ContentPlan[]>;
}
