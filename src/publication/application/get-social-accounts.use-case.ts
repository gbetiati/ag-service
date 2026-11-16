import { Injectable } from '@nestjs/common';
import { SocialAccount } from '../domain/social-account.entity.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';

@Injectable()
export class GetSocialAccountsUseCase {
  constructor(private readonly socialAccountRepository: SocialAccountRepository) {}

  async execute(companyId: string): Promise<SocialAccount[]> {
    return this.socialAccountRepository.findByCompany(companyId);
  }
}
