import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailVerificationPolicy } from '../../domain/email-verification-policy.interface.js';

@Injectable()
export class EnvironmentEmailVerificationPolicy extends EmailVerificationPolicy {
  constructor(private readonly config: ConfigService) {
    super();
  }

  isRequired(): boolean {
    return false
  }
  
  // isRequired(): boolean {
  //   const required = this.config
  //     .get<string>('IDENTITY_EMAIL_VERIFICATION_REQUIRED', 'true')
  //     .toLowerCase();
  //   if (required !== 'true' && required !== 'false') {
  //     throw new Error('IDENTITY_EMAIL_VERIFICATION_REQUIRED must be either true or false.');
  //   }

  //   if (this.config.get<string>('NODE_ENV') === 'production' && required !== 'true') {
  //     throw new Error('Email verification cannot be disabled in production.');
  //   }

  //   return required === 'true';
  // }
}
