import { ContentValidation, ValidationResult } from './content-validation.entity.js';

export abstract class ContentValidationRepository {
  abstract create(validation: ContentValidation): Promise<ContentValidation>;
  abstract update(validation: ContentValidation): Promise<ContentValidation>;
  abstract findById(id: string): Promise<ContentValidation | null>;
  abstract findByContent(contentId: string): Promise<ContentValidation[]>;
  abstract findLatestByContent(contentId: string): Promise<ContentValidation | null>;
  abstract createResult(result: ValidationResult): Promise<ValidationResult>;
  abstract deleteResults(validationId: string): Promise<void>;
  abstract findResults(validationId: string): Promise<ValidationResult[]>;
}
