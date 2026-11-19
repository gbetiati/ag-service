import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccessTokenIssuer } from '../domain/access-token-issuer.interface.js';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { PasswordHasher } from '../domain/password-hasher.interface.js';
import { createSessionToken, hashOpaqueToken } from './token-crypto.js';

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(input: { email: string; password: string }) {
    const user = await this.identityRepository.findUserByEmail(input.email.trim().toLowerCase());
    if (!user) {
      await this.passwordHasher.verifyUnknownPassword(input.password);
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!(await this.passwordHasher.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    // if (!user.emailVerifiedAt) {
    //   throw new ForbiddenException('Verify your email address before signing in.');
    // }

    const memberships = await this.identityRepository.listMemberships(user.id);
    const activeCompanyId = memberships[0]?.companyId ?? null;
    const { sessionId, token } = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    const session = await this.identityRepository.createSession({
      id: sessionId,
      userId: user.id,
      activeCompanyId,
      tokenHash: hashOpaqueToken(token),
      expiresAt,
    });

    return {
      accessToken: await this.accessTokenIssuer.issue({
        userId: user.id,
        sessionId: session.id,
        activeCompanyId: session.activeCompanyId,
      }),
      refreshToken: token,
      tokenType: 'Bearer',
      expiresIn: 9000,
    };
  }
}
