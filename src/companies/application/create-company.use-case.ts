import { ConflictException, Injectable } from '@nestjs/common';
import { IdentityConflictError } from '../../identity/domain/identity-conflict.error.js';
import { IdentityRepository } from '../../identity/domain/identity.repository.interface.js';

export type CreateCompanyInput = {
  userId: string;
  name: string;
  slug: string;
  description?: string | null;
};

@Injectable()
export class CreateCompanyUseCase {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(input: CreateCompanyInput) {
    try {
      return await this.identityRepository.createCompanyForUser({
        ...input,
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
      });
    } catch (error) {
      if (error instanceof IdentityConflictError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
