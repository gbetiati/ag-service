import { Injectable, NotFoundException } from '@nestjs/common';
import { IdentityRepository } from '../domain/identity.repository.interface.js';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(userId: string) {
    const user = await this.identityRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const companies = await this.identityRepository.listMemberships(user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      // emailVerifiedAt: user.emailVerifiedAt,
      emailVerifiedAt: true,
      companies,
    };
  }
}
