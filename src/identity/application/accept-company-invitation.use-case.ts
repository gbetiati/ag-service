import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityRepository } from '../domain/identity.repository.interface.js';
import { hashOpaqueToken } from './token-crypto.js';

@Injectable()
export class AcceptCompanyInvitationUseCase {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(input: { token: string; userId: string }) {
    const user = await this.identityRepository.findUserById(input.userId);
    // if (!user?.emailVerifiedAt) {
    //   throw new ForbiddenException('A verified email address is required to accept an invitation.');
    // }

    if (!user) return 
    
    const membership = await this.identityRepository.acceptInvitation({
      tokenHash: hashOpaqueToken(input.token),
      userId: user.id,
      email: user.email,
      now: new Date(),
    });
    if (!membership) {
      throw new BadRequestException('Invitation is invalid, expired, or already accepted.');
    }
    return membership;
  }
}
