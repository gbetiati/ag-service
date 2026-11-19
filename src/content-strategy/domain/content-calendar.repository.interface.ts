import { ContentCalendarEntry } from './content-calendar.entity.js';

export abstract class ContentCalendarRepository {
  abstract create(entry: ContentCalendarEntry): Promise<ContentCalendarEntry>;
  abstract findByCompany(companyId: string): Promise<ContentCalendarEntry[]>;
  abstract findByPlan(planId: string): Promise<ContentCalendarEntry[]>;
}
