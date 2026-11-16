import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestIdentity } from './identity-request.js';

export const IS_PUBLIC_KEY = 'identity:is-public';
export const REQUIRED_ROLES_KEY = 'identity:required-roles';
export const ALLOW_COMPANY_SELECTION_KEY = 'identity:allow-company-selection';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: Array<'OWNER' | 'ADMIN' | 'MEMBER'>) => SetMetadata(REQUIRED_ROLES_KEY, roles);
export const AllowCompanySelection = () => SetMetadata(ALLOW_COMPANY_SELECTION_KEY, true);
export const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestIdentity => {
    const request = context.switchToHttp().getRequest<{ identity: RequestIdentity }>();
    return request.identity;
  },
);
