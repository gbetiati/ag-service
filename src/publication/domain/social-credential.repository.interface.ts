import { SocialCredential } from './social-credential.entity.js';

export abstract class SocialCredentialRepository {
  abstract create(credential: SocialCredential): Promise<SocialCredential>;
  abstract update(credential: SocialCredential): Promise<SocialCredential>;
  abstract findById(id: string): Promise<SocialCredential | null>;
  abstract findBySocialAccount(socialAccountId: string): Promise<SocialCredential[]>;
  abstract findActiveBySocialAccount(socialAccountId: string): Promise<SocialCredential | null>;
}
