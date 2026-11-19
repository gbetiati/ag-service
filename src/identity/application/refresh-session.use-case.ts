import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccessTokenIssuer } from '../domain/access-token-issuer.interface.js';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { createSessionToken, hashOpaqueToken, parseSessionToken } from './token-crypto.js';

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(refreshToken: string) {
    const parsed = parseSessionToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    const session = await this.identityRepository.findSessionById(parsed.sessionId);
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const { token } = createSessionToken(session.id);
    const rotated = await this.identityRepository.rotateSession({
      sessionId: session.id,
      expectedTokenHash: parsed.tokenHash,
      newTokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
      now: new Date(),
    });
    if (!rotated) {
      await this.identityRepository.revokeSession(session.id, session.userId, new Date());
      throw new UnauthorizedException('Refresh token reuse detected. Sign in again.');
    }

    return {
      accessToken: await this.accessTokenIssuer.issue({
        userId: rotated.userId,
        sessionId: rotated.id,
        activeCompanyId: rotated.activeCompanyId,
      }),
      refreshToken: token,
      tokenType: 'Bearer',
      expiresIn: 9000,
    };
  }
}
