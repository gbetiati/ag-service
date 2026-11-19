import { Injectable } from '@nestjs/common';
import { IdentityRepository } from '../../identity/domain/identity.repository.interface.js';

@Injectable()
export class GetCompaniesUseCase {
  constructor(private readonly identityRepository: IdentityRepository) {}

  execute(userId: string) {
    return this.identityRepository.listMemberships(userId);
  }
}
