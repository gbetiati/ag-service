import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { PasswordHasher } from '../domain/password-hasher.interface.js';
import { hashOpaqueToken } from './token-crypto.js';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: { token: string; password: string }): Promise<{ message: string }> {
    if (input.password.length < 12) {
      throw new BadRequestException('Password must contain at least 12 characters.');
    }

    const user = await this.identityRepository.resetPassword(
      hashOpaqueToken(input.token),
      await this.passwordHasher.hash(input.password),
      new Date(),
    );
    if (!user) {
      throw new BadRequestException('Password reset token is invalid or expired.');
    }
    return { message: 'Password updated. Sign in again with your new password.' };
  }
}
