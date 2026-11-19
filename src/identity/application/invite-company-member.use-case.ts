import { Injectable } from '@nestjs/common';
import { EmailSender } from '../domain/email-sender.interface.js';
import { CompanyMemberRole } from '../domain/company-member.entity.js';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { createOpaqueToken, hashOpaqueToken } from './token-crypto.js';

@Injectable()
export class InviteCompanyMemberUseCase {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly emailSender: EmailSender,
  ) {}

  async execute(input: {
    companyId: string;
    invitedByUserId: string;
    email: string;
    role: CompanyMemberRole;
  }) {
    const email = input.email.trim().toLowerCase();
    const token = createOpaqueToken();
    const invitation = await this.identityRepository.createInvitation({
      ...input,
      email,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.emailSender.send({
      to: email,
      subject: 'You are invited to join a company',
      text: `Accept this invitation using this token: ${token}`,
      html: `<p>Accept this invitation using this token:</p><p>${token}</p>`,
    });
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }
}
