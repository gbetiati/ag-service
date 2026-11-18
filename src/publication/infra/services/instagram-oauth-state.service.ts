import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

type OAuthStatePayload = {
  companyId: string;
  exp: number;
  nonce: string;
};

@Injectable()
export class InstagramOAuthStateService {
  private readonly ttlSeconds = 10 * 60;

  constructor(private readonly configService: ConfigService) {}

  create(companyId: string): string {
    const payload: OAuthStatePayload = {
      companyId,
      exp: Math.floor(Date.now() / 1000) + this.ttlSeconds,
      nonce: crypto.randomUUID(),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.sign(encoded);
    return `${encoded}.${signature}`;
  }

  parse(state: string): { companyId: string } {
    const [encoded, signature] = state.split('.');
    if (!encoded || !signature) {
      throw new BadRequestException('Invalid OAuth state.');
    }

    const expected = this.sign(encoded);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new BadRequestException('Invalid OAuth state signature.');
    }

    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OAuthStatePayload;
    } catch {
      throw new BadRequestException('Invalid OAuth state payload.');
    }

    if (!payload.companyId || typeof payload.exp !== 'number') {
      throw new BadRequestException('Invalid OAuth state payload.');
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('OAuth state expired. Start Instagram connect again.');
    }

    return { companyId: payload.companyId };
  }

  private sign(encoded: string): string {
    const secret = this.configService.get<string>('META_OAUTH_STATE_SECRET')
      ?? this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    return createHmac('sha256', secret).update(encoded).digest('base64url');
  }
}
