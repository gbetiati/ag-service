import { PublicationAttempt } from './publication-attempt.entity.js';

export abstract class PublicationAttemptRepository {
  abstract create(attempt: PublicationAttempt): Promise<PublicationAttempt>;
  abstract findByPublication(publicationId: string): Promise<PublicationAttempt[]>;
}
