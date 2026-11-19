import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CompleteInstagramOAuthUseCase } from '../../application/complete-instagram-oauth.use-case.js';
import { StartInstagramOAuthUseCase } from '../../application/start-instagram-oauth.use-case.js';
import { Public, Roles } from '../../../identity/infra/http/identity.decorators.js';

@Controller()
export class InstagramOAuthController {
  constructor(
    private readonly startInstagramOAuth: StartInstagramOAuthUseCase,
    private readonly completeInstagramOAuth: CompleteInstagramOAuthUseCase,
  ) {}

  /**
   * Authenticated connect: generates signed OAuth state and redirects to Meta login.
   */
  @Get('companies/:companyId/social-accounts/instagram/connect')
  @Roles('OWNER', 'ADMIN')
  async connect(@Param('companyId') companyId: string, @Res() response: Response) {
    const { authorizationUrl } = this.startInstagramOAuth.execute({ companyId });
    return response.redirect(authorizationUrl);
  }

  @Get('companies/:companyId/social-accounts/instagram/connect-url')
  @Roles('OWNER', 'ADMIN')
  getConnectUrl(@Param('companyId') companyId: string) {
    return this.startInstagramOAuth.execute({ companyId });
  }

  /**
   * Browser-friendly entry: GET /auth/instagram/login?companyId=<uuid>
   * Creates a signed state via InstagramOAuthStateService and redirects to Meta.
   */
  @Get('auth/instagram/login')
  @Public()
  async login(@Query('companyId') companyId: string | undefined, @Res() response: Response) {
    if (!companyId?.trim()) {
      throw new BadRequestException(
        'Query param companyId is required. Example: /auth/instagram/login?companyId=<uuid>',
      );
    }

    const { authorizationUrl } = this.startInstagramOAuth.execute({ companyId: companyId.trim() });
    return response.redirect(authorizationUrl);
  }

  /**
   * Meta OAuth callback (must match META_OAUTH_REDIRECT_URI).
   */
  @Get('auth/instagram/callback')
  @Public()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
  ) {
    const result = await this.completeInstagramOAuth.execute({
      code,
      state,
      error,
      errorDescription,
    });

    return {
      success: true,
      message: 'Instagram connected and credentials saved successfully.',
      data: result,
    };
  }
}
