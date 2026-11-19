import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenClaims, AccessTokenIssuer } from '../../domain/access-token-issuer.interface.js';

@Injectable()
export class JwtAccessTokenIssuer extends AccessTokenIssuer {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  issue(claims: AccessTokenClaims): Promise<string> {
    return this.jwtService.signAsync({
      sub: claims.userId,
      sid: claims.sessionId,
      activeCompanyId: claims.activeCompanyId,
    });
  }
}
