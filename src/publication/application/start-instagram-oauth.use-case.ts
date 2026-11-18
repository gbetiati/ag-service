import { Injectable } from '@nestjs/common';
import { MetaInstagramOAuthProvider } from '../domain/meta-instagram-oauth.provider.interface.js';
import { InstagramOAuthStateService } from '../infra/services/instagram-oauth-state.service.js';

@Injectable()
export class StartInstagramOAuthUseCase {
  constructor(
    private readonly metaOAuthProvider: MetaInstagramOAuthProvider,
    private readonly oauthStateService: InstagramOAuthStateService,
  ) {}

  execute(input: { companyId: string }): { authorizationUrl: string } {
    const state = this.oauthStateService.create(input.companyId);
    return {
      authorizationUrl: this.metaOAuthProvider.buildAuthorizationUrl({ state }),
    };
  }
}
