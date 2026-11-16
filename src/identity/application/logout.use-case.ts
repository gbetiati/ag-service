import { Injectable } from '@nestjs/common';
import { IdentityRepository } from '../domain/identity.repository.interface.js';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(input: { sessionId: string; userId: string }): Promise<void> {
    await this.identityRepository.revokeSession(input.sessionId, input.userId, new Date());
  }
}
