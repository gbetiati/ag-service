import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessTokenIssuer } from '../domain/access-token-issuer.interface.js';
import { IdentityRepository } from '../domain/identity.repository.interface.js';

@Injectable()
export class SelectCompanyUseCase {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(input: { userId: string; sessionId: string; companyId: string }) {
    const membership = await this.identityRepository.findMembership(input.userId, input.companyId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this company.');
    }
    const session = await this.identityRepository.selectCompany({
      ...input,
      now: new Date(),
    });
    if (!session) {
      throw new NotFoundException('Active session not found.');
    }
    return {
      accessToken: await this.accessTokenIssuer.issue({
        userId: session.userId,
        sessionId: session.id,
        activeCompanyId: session.activeCompanyId,
      }),
      tokenType: 'Bearer',
      expiresIn: 9000,
    };
  }
}
