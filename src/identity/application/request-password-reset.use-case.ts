import { Injectable } from '@nestjs/common';
import { EmailSender } from '../domain/email-sender.interface.js';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { createOpaqueToken, hashOpaqueToken } from './token-crypto.js';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly emailSender: EmailSender,
  ) {}

  async execute(emailInput: string): Promise<{ message: string }> {
    const message = 'If the account exists, a password reset email has been sent.';
    const user = await this.identityRepository.findUserByEmail(emailInput.trim().toLowerCase());
    if (!user) {
      return { message };
    }

    const token = createOpaqueToken();
    await this.identityRepository.createIdentityToken({
      userId: user.id,
      type: 'PASSWORD_RESET',
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await this.emailSender.send({
      to: user.email,
      subject: 'Reset your password',
      text: `Reset your password using this token: ${token}`,
      html: `<p>Reset your password using this token:</p><p>${token}</p>`,
    });
    return { message };
  }
}
