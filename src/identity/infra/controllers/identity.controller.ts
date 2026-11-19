import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AcceptCompanyInvitationUseCase } from '../../application/accept-company-invitation.use-case.js';
import { GetCurrentUserUseCase } from '../../application/get-current-user.use-case.js';
import { InviteCompanyMemberUseCase } from '../../application/invite-company-member.use-case.js';
import { LoginUseCase } from '../../application/login.use-case.js';
import { LogoutUseCase } from '../../application/logout.use-case.js';
import { RefreshSessionUseCase } from '../../application/refresh-session.use-case.js';
import { RegisterAccountUseCase } from '../../application/register-account.use-case.js';
import { RequestEmailVerificationUseCase } from '../../application/request-email-verification.use-case.js';
import { RequestPasswordResetUseCase } from '../../application/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../../application/reset-password.use-case.js';
import { SelectCompanyUseCase } from '../../application/select-company.use-case.js';
import { VerifyEmailUseCase } from '../../application/verify-email.use-case.js';
import { AcceptCompanyInvitationDto, CreateCompanyInvitationDto } from '../dto/company-invitation.dto.js';
import { EmailDto } from '../dto/email.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { RefreshSessionDto } from '../dto/refresh-session.dto.js';
import { RegisterAccountDto } from '../dto/register-account.dto.js';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';
import { VerifyEmailDto } from '../dto/verify-email.dto.js';
import { AllowCompanySelection, CurrentIdentity, Public, Roles } from '../http/identity.decorators.js';
import type { RequestIdentity } from '../http/identity-request.js';

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
export class IdentityController {
  constructor(
    private readonly registerAccount: RegisterAccountUseCase,
    private readonly login: LoginUseCase,
    private readonly logout: LogoutUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly requestEmailVerification: RequestEmailVerificationUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly selectCompany: SelectCompanyUseCase,
    private readonly inviteCompanyMember: InviteCompanyMemberUseCase,
    private readonly acceptCompanyInvitation: AcceptCompanyInvitationUseCase,
  ) {}

  @Public()
  @Post('register')
  register(@Body() body: RegisterAccountDto) {
    return this.registerAccount.execute(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  loginWithPassword(@Body() body: LoginDto) {
    return this.login.execute(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshSessionDto) {
    return this.refreshSession.execute(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutCurrentSession(@CurrentIdentity() identity: RequestIdentity): Promise<void> {
    await this.logout.execute({ sessionId: identity.sessionId, userId: identity.userId });
  }

  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  verifyEmailAddress(@Body() body: VerifyEmailDto) {
    return this.verifyEmail.execute(body.token);
  }

  @Public()
  @Post('email/verification/request')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() body: EmailDto) {
    return this.requestEmailVerification.execute(body.email);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: EmailDto) {
    return this.requestPasswordReset.execute(body.email);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  resetPasswordWithToken(@Body() body: ResetPasswordDto) {
    return this.resetPassword.execute(body);
  }

  @Get('me')
  getAuthenticatedUser(@CurrentIdentity() identity: RequestIdentity) {
    return this.getCurrentUser.execute(identity.userId);
  }

  @Post('companies/:companyId/select')
  @HttpCode(HttpStatus.OK)
  @AllowCompanySelection()
  selectActiveCompany(@CurrentIdentity() identity: RequestIdentity, @Param('companyId') companyId: string) {
    return this.selectCompany.execute({
      userId: identity.userId,
      sessionId: identity.sessionId,
      companyId,
    });
  }

  @Post('invitations')
  @Roles('OWNER', 'ADMIN')
  createInvitation(@Body() body: CreateCompanyInvitationDto, @CurrentIdentity() identity: RequestIdentity) {
    if (!identity.activeCompanyId) {
      throw new ForbiddenException('Select an active company before inviting a member.');
    }
    return this.inviteCompanyMember.execute({
      companyId: identity.activeCompanyId,
      invitedByUserId: identity.userId,
      email: body.email,
      role: body.role,
    });
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Body() body: AcceptCompanyInvitationDto, @CurrentIdentity() identity: RequestIdentity) {
    return this.acceptCompanyInvitation.execute({ token: body.token, userId: identity.userId });
  }
}
