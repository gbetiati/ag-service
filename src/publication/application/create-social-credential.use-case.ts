import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialCredential } from '../domain/social-credential.entity.js';
import { SocialCredentialRepository } from '../domain/social-credential.repository.interface.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';
import { CredentialEncryptionService } from '../infra/services/credential-encryption.service.js';

export type CreateSocialCredentialInput = {
  companyId: string;
  socialAccountId: string;
  kind: 'ACCESS_TOKEN' | 'REFRESH_TOKEN';
  secret: string;
  expiresAt?: Date | null;
  scopes?: Record<string, unknown> | null;
};

@Injectable()
export class CreateSocialCredentialUseCase {
  constructor(
    private readonly socialAccountRepository: SocialAccountRepository,
    private readonly socialCredentialRepository: SocialCredentialRepository,
    private readonly credentialEncryptionService: CredentialEncryptionService,
  ) {}

  async execute(input: CreateSocialCredentialInput): Promise<SocialCredential> {
    const account = await this.socialAccountRepository.findById(input.socialAccountId);
    if (!account || account.companyId !== input.companyId) {
      throw new NotFoundException('Social account not found for this company.');
    }

    const encrypted = this.credentialEncryptionService.encrypt(input.secret);
    const credential = SocialCredential.create({
      companyId: input.companyId,
      socialAccountId: input.socialAccountId,
      kind: input.kind,
      encryptedValue: encrypted.encryptedValue,
      initializationVector: encrypted.initializationVector,
      expiresAt: input.expiresAt ?? null,
      scopes: input.scopes ?? null,
    });

    return this.socialCredentialRepository.create(credential);
  }
}
