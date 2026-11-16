import { ConflictException, Injectable } from '@nestjs/common';
import { SocialAccount } from '../domain/social-account.entity.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';

export type CreateSocialAccountInput = {
  companyId: string;
  platform: 'INSTAGRAM';
  accountHandle: string;
  displayName?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class CreateSocialAccountUseCase {
  constructor(private readonly socialAccountRepository: SocialAccountRepository) {}

  async execute(input: CreateSocialAccountInput): Promise<SocialAccount> {
    const existingAccounts = await this.socialAccountRepository.findByCompanyAndPlatform(input.companyId, input.platform);
    const duplicate = existingAccounts.find(
      (account) => account.accountHandle.toLowerCase() === input.accountHandle.toLowerCase(),
    );

    if (duplicate) {
      throw new ConflictException('A social account with this handle already exists for the company.');
    }

    const account = SocialAccount.create({
      companyId: input.companyId,
      platform: input.platform,
      accountHandle: input.accountHandle,
      displayName: input.displayName ?? null,
      metadata: input.metadata ?? null,
    });

    return this.socialAccountRepository.create(account);
  }
}
