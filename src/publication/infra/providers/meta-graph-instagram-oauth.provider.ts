import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MetaInstagramAccount,
  MetaInstagramOAuthProvider,
  MetaOAuthToken,
} from '../../domain/meta-instagram-oauth.provider.interface.js';

@Injectable()
export class MetaGraphInstagramOAuthProvider extends MetaInstagramOAuthProvider {
  private readonly logger = new Logger(MetaGraphInstagramOAuthProvider.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  buildAuthorizationUrl(input: { state: string }): string {
    const clientId = this.configService.getOrThrow<string>('META_APP_ID');
    const configId = this.configService.getOrThrow<string>('META_LOGIN_CONFIG_ID');
    const redirectUri = this.configService.getOrThrow<string>('META_OAUTH_REDIRECT_URI');
    const dialogBase = this.configService.get<string>('META_OAUTH_DIALOG_URL')
      ?? 'https://www.facebook.com/v21.0/dialog/oauth';

    const url = new URL(dialogBase);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('config_id', configId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', input.state);
    url.searchParams.set('prompt', 'login');
    return url.toString();
  }

  async exchangeCode(code: string): Promise<MetaOAuthToken> {
    const graphBase = this.graphBaseUrl();
    const url = new URL(`${graphBase}/oauth/access_token`);
    url.searchParams.set('client_id', this.configService.getOrThrow<string>('META_APP_ID'));
    url.searchParams.set('client_secret', this.configService.getOrThrow<string>('META_APP_SECRET'));
    url.searchParams.set('redirect_uri', this.configService.getOrThrow<string>('META_OAUTH_REDIRECT_URI'));
    url.searchParams.set('code', code);

    return this.fetchToken(url);
  }

  async exchangeForLongLivedToken(shortLivedToken: string): Promise<MetaOAuthToken> {
    const graphBase = this.graphBaseUrl();
    const url = new URL(`${graphBase}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', this.configService.getOrThrow<string>('META_APP_ID'));
    url.searchParams.set('client_secret', this.configService.getOrThrow<string>('META_APP_SECRET'));
    url.searchParams.set('fb_exchange_token', shortLivedToken);

    try {
      return await this.fetchToken(url);
    } catch (error) {
      this.logger.warn(
        `Long-lived token exchange skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        accessToken: shortLivedToken,
        tokenType: 'bearer',
        expiresInSeconds: null,
      };
    }
  }

  async listAssignedInstagramAccounts(accessToken: string): Promise<MetaInstagramAccount[]> {
    const graphBase = this.graphBaseUrl();
    const url = new URL(`${graphBase}/me/assigned_instagram_accounts`);
    url.searchParams.set('fields', 'id,username');
    url.searchParams.set('access_token', accessToken);

    const payload = await this.fetchJson<{
      data?: Array<{ id?: string; username?: string }>;
      error?: { message?: string };
    }>(url);

    const accounts = (payload.data ?? [])
      .filter((item): item is { id: string; username?: string } => typeof item.id === 'string' && item.id.length > 0)
      .map((item) => ({
        id: item.id,
        username: item.username ?? null,
      }));

    if (accounts.length > 0) {
      return accounts;
    }

    // Fallback for Page-linked Instagram Business accounts.
    const pagesUrl = new URL(`${graphBase}/me/accounts`);
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account{id,username}');
    pagesUrl.searchParams.set('access_token', accessToken);
    const pages = await this.fetchJson<{
      data?: Array<{
        instagram_business_account?: { id?: string; username?: string };
      }>;
    }>(pagesUrl);

    return (pages.data ?? [])
      .map((page) => page.instagram_business_account)
      .filter((ig): ig is { id: string; username?: string } => typeof ig?.id === 'string' && ig.id.length > 0)
      .map((ig) => ({
        id: ig.id,
        username: ig.username ?? null,
      }));
  }

  private graphBaseUrl(): string {
    const version = this.configService.get<string>('META_GRAPH_API_VERSION') ?? 'v21.0';
    const host = this.configService.get<string>('INSTAGRAM_API_BASE_URL') ?? 'https://graph.facebook.com';
    return `${host.replace(/\/$/, '')}/${version.replace(/^\//, '')}`;
  }

  private async fetchToken(url: URL): Promise<MetaOAuthToken> {
    const payload = await this.fetchJson<{
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: { message?: string };
    }>(url);

    if (!payload.access_token) {
      throw new Error(payload.error?.message ?? 'Meta OAuth token exchange failed.');
    }

    return {
      accessToken: payload.access_token,
      tokenType: payload.token_type ?? null,
      expiresInSeconds: typeof payload.expires_in === 'number' ? payload.expires_in : null,
    };
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const payload = (await response.json()) as T & { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Meta Graph request failed (${response.status}).`);
    }
    return payload;
  }
}
