export type AccessTokenClaims = {
  userId: string;
  sessionId: string;
  activeCompanyId: string | null;
};

export abstract class AccessTokenIssuer {
  abstract issue(claims: AccessTokenClaims): Promise<string>;
}
