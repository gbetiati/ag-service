import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { EmailSender } from '../domain/email-sender.interface.js';
import { EmailVerificationPolicy } from '../domain/email-verification-policy.interface.js';
import { IdentityConflictError } from '../domain/identity-conflict.error.js';
import { IdentityInvitationError } from '../domain/identity-invitation.error.js';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { PasswordHasher } from '../domain/password-hasher.interface.js';
import { createOpaqueToken, hashOpaqueToken } from './token-crypto.js';

@Injectable()
export class RegisterAccountUseCase {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly emailSender: EmailSender,
    private readonly emailVerificationPolicy: EmailVerificationPolicy,
  ) {}

  async execute(input: {
    name: string;
    email: string;
    password: string;
    companyName?: string;
    companySlug?: string;
    invitationToken?: string;
  }): Promise<{ message: string }> {
    if (input.password.length < 12) {
      throw new BadRequestException('Password must contain at least 12 characters.');
    }

    const email = input.email.trim().toLowerCase();
    const verificationRequired = this.emailVerificationPolicy.isRequired();
    const token = verificationRequired ? createOpaqueToken() : null;
    const now = new Date();
    try {
      const passwordHash = await this.passwordHasher.hash(input.password);
      const verificationTokenHash = token ? hashOpaqueToken(token) : undefined;
      const verificationExpiresAt = token ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : undefined;
      if (input.invitationToken) {
        await this.identityRepository.registerInvitedUser({
          name: input.name.trim(),
          email,
          passwordHash,
          invitationTokenHash: hashOpaqueToken(input.invitationToken),
          verificationTokenHash,
          verificationExpiresAt,
          emailVerifiedAt: verificationRequired ? null : now,
          now,
        });
      } else {
        if (!input.companyName?.trim() || !input.companySlug?.trim()) {
          throw new BadRequestException('Company name and slug are required without an invitation.');
        }
        await this.identityRepository.registerOwner({
          name: input.name.trim(),
          email,
          passwordHash,
          companyName: input.companyName.trim(),
          companySlug: input.companySlug.trim().toLowerCase(),
          emailVerifiedAt: verificationRequired ? null : now,
          verificationTokenHash,
          verificationExpiresAt,
        });
      }
    } catch (error) {
      if (error instanceof IdentityConflictError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof IdentityInvitationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    if (token) {
      await this.emailSender.send({
        to: email,
        subject: 'Verify your email address',
        text: `Verify your email address using this token: ${token}`,
        html: `<p>Verify your email address using this token:</p><p>${token}</p>`,
      });
    }

    return {
      message: verificationRequired
        ? 'Account created. Check your email to verify the address before signing in.'
        : 'Account created and email verification skipped for this environment.',
    };
  }
}
