import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AcceptCompanyInvitationUseCase } from './application/accept-company-invitation.use-case.js';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case.js';
import { InviteCompanyMemberUseCase } from './application/invite-company-member.use-case.js';
import { LoginUseCase } from './application/login.use-case.js';
import { LogoutUseCase } from './application/logout.use-case.js';
import { RefreshSessionUseCase } from './application/refresh-session.use-case.js';
import { RegisterAccountUseCase } from './application/register-account.use-case.js';
import { RequestEmailVerificationUseCase } from './application/request-email-verification.use-case.js';
import { RequestPasswordResetUseCase } from './application/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from './application/reset-password.use-case.js';
import { SelectCompanyUseCase } from './application/select-company.use-case.js';
import { VerifyEmailUseCase } from './application/verify-email.use-case.js';
import { AccessTokenIssuer } from './domain/access-token-issuer.interface.js';
import { EmailSender } from './domain/email-sender.interface.js';
import { EmailVerificationPolicy } from './domain/email-verification-policy.interface.js';
import { IdentityRepository } from './domain/identity.repository.interface.js';
import { PasswordHasher } from './domain/password-hasher.interface.js';
import { IdentityController } from './infra/controllers/identity.controller.js';
import { CompanyMembershipGuard } from './infra/guards/company-membership.guard.js';
import { CompanyRolesGuard } from './infra/guards/company-roles.guard.js';
import { JwtAuthenticationGuard } from './infra/guards/jwt-authentication.guard.js';
import { PrismaIdentityRepository } from './infra/repositories/prisma-identity.repository.js';
import { EnvironmentEmailVerificationPolicy } from './infra/config/environment-email-verification-policy.js';
import { Argon2PasswordHasher } from './infra/security/argon2-password-hasher.js';
import { JwtAccessTokenIssuer } from './infra/security/jwt-access-token-issuer.js';
import { SmtpEmailSender } from './infra/services/smtp-email-sender.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
        if (secret.length < 32) {
          throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
        }
        return {
          secret,
          signOptions: { expiresIn: 9000, issuer: 'ag-service', audience: 'ag-service-api' },
        };
      },
    }),
  ],
  controllers: [IdentityController],
  providers: [
    RegisterAccountUseCase,
    LoginUseCase,
    LogoutUseCase,
    RefreshSessionUseCase,
    VerifyEmailUseCase,
    RequestEmailVerificationUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    GetCurrentUserUseCase,
    SelectCompanyUseCase,
    InviteCompanyMemberUseCase,
    AcceptCompanyInvitationUseCase,
    { provide: IdentityRepository, useClass: PrismaIdentityRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: AccessTokenIssuer, useClass: JwtAccessTokenIssuer },
    { provide: EmailSender, useClass: SmtpEmailSender },
    { provide: EmailVerificationPolicy, useClass: EnvironmentEmailVerificationPolicy },
    { provide: APP_GUARD, useClass: JwtAuthenticationGuard },
    { provide: APP_GUARD, useClass: CompanyMembershipGuard },
    { provide: APP_GUARD, useClass: CompanyRolesGuard },
  ],
  exports: [IdentityRepository],
})
export class IdentityModule {}
