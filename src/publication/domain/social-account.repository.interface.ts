import { SocialAccount } from './social-account.entity.js';

export abstract class SocialAccountRepository {
  abstract create(account: SocialAccount): Promise<SocialAccount>;
  abstract update(account: SocialAccount): Promise<SocialAccount>;
  abstract findById(id: string): Promise<SocialAccount | null>;
  abstract findByCompany(companyId: string): Promise<SocialAccount[]>;
  abstract findByCompanyAndPlatform(companyId: string, platform: string): Promise<SocialAccount[]>;
}
