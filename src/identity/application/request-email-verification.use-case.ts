import { Injectable } from '@nestjs/common';
import { EmailSender } from '../domain/email-sender.interface.js';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { createOpaqueToken, hashOpaqueToken } from './token-crypto.js';

@Injectable()
export class RequestEmailVerificationUseCase {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly emailSender: EmailSender,
  ) {}

  async execute(emailInput: string): Promise<{ message: string }> {
    const message = 'If the account exists and is not verified, a verification email has been sent.';
    const user = await this.identityRepository.findUserByEmail(emailInput.trim().toLowerCase());
    // if (!user || user.emailVerifiedAt) {
    //   return { message };
    // }

    if (!user) return {message: 'FALHOU'}

    const token = createOpaqueToken();
    await this.identityRepository.createIdentityToken({
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await this.emailSender.send({
      to: user.email,
      subject: 'Verify your email address',
      text: `Verify your email address using this token: ${token}`,
      html: `<p>Verify your email address using this token:</p><p>${token}</p>`,
    });
    return { message };
  }
}
