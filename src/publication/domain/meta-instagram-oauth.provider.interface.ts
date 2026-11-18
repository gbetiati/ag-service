export type MetaOAuthToken = {
  accessToken: string;
  tokenType: string | null;
  expiresInSeconds: number | null;
};

export type MetaInstagramAccount = {
  id: string;
  username: string | null;
};

export abstract class MetaInstagramOAuthProvider {
  abstract buildAuthorizationUrl(input: { state: string }): string;

  abstract exchangeCode(code: string): Promise<MetaOAuthToken>;

  abstract exchangeForLongLivedToken(shortLivedToken: string): Promise<MetaOAuthToken>;

  abstract listAssignedInstagramAccounts(accessToken: string): Promise<MetaInstagramAccount[]>;
}
