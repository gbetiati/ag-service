import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IdentityRepository } from '../../domain/identity.repository.interface.js';
import { IS_PUBLIC_KEY } from '../http/identity.decorators.js';
import { RequestIdentity } from '../http/identity-request.js';

type JwtPayload = {
  sub: string;
  sid: string;
  activeCompanyId: string | null;
};

@Injectable()
export class JwtAuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly identityRepository: IdentityRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; identity?: RequestIdentity }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('A bearer access token is required.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(authorization.slice(7), {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        issuer: 'ag-service',
        audience: 'ag-service-api',
      });
    } catch (error) {
      if (error instanceof Error && ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
        throw new UnauthorizedException('Access token is invalid or expired.');
      }
      throw error;
    }

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      (payload.activeCompanyId !== null && typeof payload.activeCompanyId !== 'string')
    ) {
      throw new UnauthorizedException('Access token payload is invalid.');
    }

    const session = await this.identityRepository.findSessionById(payload.sid);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.activeCompanyId !== payload.activeCompanyId
    ) {
      throw new UnauthorizedException('Session is invalid or revoked.');
    }
    const user = await this.identityRepository.findUserById(payload.sub);
    // if (!user?.emailVerifiedAt) {
    //   throw new UnauthorizedException('User is unavailable or email is not verified.');
    // }

    if (!user) return false
    
    const membership = payload.activeCompanyId
      ? await this.identityRepository.findMembership(payload.sub, payload.activeCompanyId)
      : null;
    if (payload.activeCompanyId && !membership) {
      throw new UnauthorizedException('Active company membership is no longer valid.');
    }
    request.identity = {
      userId: user.id,
      sessionId: session.id,
      activeCompanyId: session.activeCompanyId,
      companyRole: membership?.role ?? null,
    };
    return true;
  }
}
