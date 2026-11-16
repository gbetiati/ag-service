import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanyMemberRole } from '../../domain/company-member.entity.js';
import { REQUIRED_ROLES_KEY } from '../http/identity.decorators.js';
import { RequestIdentity } from '../http/identity-request.js';

@Injectable()
export class CompanyRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<CompanyMemberRole[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ identity: RequestIdentity }>();
    if (!request.identity.companyRole || !roles.includes(request.identity.companyRole)) {
      throw new ForbiddenException('Your company role does not allow this operation.');
    }
    return true;
  }
}
