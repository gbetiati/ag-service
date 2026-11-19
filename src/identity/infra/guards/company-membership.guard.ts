import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IdentityRepository } from '../../domain/identity.repository.interface.js';
import { ALLOW_COMPANY_SELECTION_KEY } from '../http/identity.decorators.js';
import { RequestIdentity } from '../http/identity-request.js';

@Injectable()
export class CompanyMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identityRepository: IdentityRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { companyId?: string };
      identity: RequestIdentity;
    }>();
    const companyId = request.params.companyId;
    if (!companyId) {
      return true;
    }

    const maySelectCompany = this.reflector.getAllAndOverride<boolean>(ALLOW_COMPANY_SELECTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!maySelectCompany && request.identity.activeCompanyId !== companyId) {
      throw new ForbiddenException('Select this company before accessing its resources.');
    }

    const membership = await this.identityRepository.findMembership(request.identity.userId, companyId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this company.');
    }
    request.identity.companyRole = membership.role;
    return true;
  }
}
