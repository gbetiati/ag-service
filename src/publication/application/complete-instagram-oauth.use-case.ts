import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SocialAccount } from '../domain/social-account.entity.js';
import { SocialAccountRepository } from '../domain/social-account.repository.interface.js';
import { SocialCredential } from '../domain/social-credential.entity.js';
import { SocialCredentialRepository } from '../domain/social-credential.repository.interface.js';
import { MetaInstagramOAuthProvider } from '../domain/meta-instagram-oauth.provider.interface.js';
import { CredentialEncryptionService } from '../infra/services/credential-encryption.service.js';
import { InstagramOAuthStateService } from '../infra/services/instagram-oauth-state.service.js';

export type CompleteInstagramOAuthResult = {
  companyId: string;
  accounts: Array<{
    socialAccountId: string;
    igUserId: string;
    username: string | null;
    credentialId: string;
  }>;
};

@Injectable()
export class CompleteInstagramOAuthUseCase {
  constructor(
    private readonly metaOAuthProvider: MetaInstagramOAuthProvider,
    private readonly oauthStateService: InstagramOAuthStateService,
    private readonly socialAccountRepository: SocialAccountRepository,
    private readonly socialCredentialRepository: SocialCredentialRepository,
    private readonly credentialEncryptionService: CredentialEncryptionService,
  ) {}

  async execute(input: { code?: string; state?: string; error?: string; errorDescription?: string }): Promise<CompleteInstagramOAuthResult> {
    if (input.error) {
      throw new BadRequestException(input.errorDescription ?? input.error);
    }
    if (!input.code || !input.state) {
      throw new BadRequestException('Meta OAuth callback requires code and state.');
    }

    const { companyId } = this.oauthStateService.parse(input.state);
    const shortLived = await this.metaOAuthProvider.exchangeCode(input.code);
    // Unified Login may already return a long-lived/system-user token; exchange is best-effort.
    const token = await this.metaOAuthProvider.exchangeForLongLivedToken(shortLived.accessToken);

    const igAccounts = await this.metaOAuthProvider.listAssignedInstagramAccounts(token.accessToken);
    if (igAccounts.length === 0) {
      throw new NotFoundException(
        'No Instagram accounts were returned for this Meta login. Ensure the Instagram professional account is linked to the configuration.',
      );
    }

    const encrypted = this.credentialEncryptionService.encrypt(token.accessToken);
    const expiresAt =
      token.expiresInSeconds && token.expiresInSeconds > 0
        ? new Date(Date.now() + token.expiresInSeconds * 1000)
        : null;

    const accounts: CompleteInstagramOAuthResult['accounts'] = [];

    for (const ig of igAccounts) {
      const existing = await this.socialAccountRepository.findByCompanyAndPlatform(companyId, 'INSTAGRAM');
      let account = existing.find((item) => item.accountHandle === ig.id) ?? null;

      if (!account) {
        account = await this.socialAccountRepository.create(
          SocialAccount.create({
            companyId,
            platform: 'INSTAGRAM',
            accountHandle: ig.id,
            displayName: ig.username,
            status: 'ACTIVE',
            metadata: {
              source: 'meta-unified-login',
              username: ig.username,
            },
          }),
        );
      } else if (account.status !== 'ACTIVE' || account.displayName !== ig.username) {
        account.status = 'ACTIVE';
        const updated = SocialAccount.create({
          id: account.id,
          companyId: account.companyId,
          platform: account.platform,
          accountHandle: account.accountHandle,
          displayName: ig.username ?? account.displayName,
          status: 'ACTIVE',
          metadata: {
            ...(account.metadata ?? {}),
            source: 'meta-unified-login',
            username: ig.username,
          },
          createdAt: account.createdAt,
        });
        account = await this.socialAccountRepository.update(updated);
      }

      const credential = await this.socialCredentialRepository.create(
        SocialCredential.create({
          companyId,
          socialAccountId: account.id,
          kind: 'ACCESS_TOKEN',
          encryptedValue: encrypted.encryptedValue,
          initializationVector: encrypted.initializationVector,
          expiresAt,
          scopes: {
            source: 'meta-unified-login',
            tokenType: token.tokenType,
          },
        }),
      );

      accounts.push({
        socialAccountId: account.id,
        igUserId: ig.id,
        username: ig.username,
        credentialId: credential.id,
      });
    }

    return { companyId, accounts };
  }
}
