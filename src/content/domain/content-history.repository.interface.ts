import { ContentHistory } from './content-history.entity.js';

export abstract class ContentHistoryRepository {
  abstract create(history: ContentHistory): Promise<ContentHistory>;
  abstract findByContent(contentId: string): Promise<ContentHistory[]>;
}
