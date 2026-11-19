import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { hashOpaqueToken } from './token-crypto.js';

@Injectable()
export class VerifyEmailUseCase {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(token: string): Promise<{ message: string }> {
    const user = await this.identityRepository.verifyEmail(hashOpaqueToken(token), new Date());
    if (!user) {
      throw new BadRequestException('Verification token is invalid or expired.');
    }
    return { message: 'Email address verified.' };
  }
}
