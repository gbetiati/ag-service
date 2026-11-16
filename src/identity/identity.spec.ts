import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { LoginUseCase } from './application/login.use-case.js';
import { RefreshSessionUseCase } from './application/refresh-session.use-case.js';
import { RegisterAccountUseCase } from './application/register-account.use-case.js';
import { hashOpaqueToken } from './application/token-crypto.js';
import { AccessTokenIssuer } from './domain/access-token-issuer.interface.js';
import { EmailSender } from './domain/email-sender.interface.js';
import { EmailVerificationPolicy } from './domain/email-verification-policy.interface.js';
import { IdentityRepository } from './domain/identity.repository.interface.js';
import { PasswordHasher } from './domain/password-hasher.interface.js';
import { CompanyMembershipGuard } from './infra/guards/company-membership.guard.js';
import { CompanyRolesGuard } from './infra/guards/company-roles.guard.js';
import { JwtAuthenticationGuard } from './infra/guards/jwt-authentication.guard.js';
import { RequestIdentity } from './infra/http/identity-request.js';

const user = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  passwordHash: 'argon-hash',
  emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createContext(request: { params: { companyId?: string }; identity: RequestIdentity }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('identity use cases', () => {
  it('creates an owner account and sends a one-time email verification token', async () => {
    const registerOwner = vi.fn().mockResolvedValue(user);
    const send = vi.fn().mockResolvedValue(undefined);
    const identityRepository = {
      registerOwner,
    } as unknown as IdentityRepository;
    const passwordHasher = {
      hash: vi.fn().mockResolvedValue('argon-hash'),
    } as unknown as PasswordHasher;
    const emailSender = { send } as unknown as EmailSender;
    const emailVerificationPolicy = { isRequired: vi.fn().mockReturnValue(true) } as unknown as EmailVerificationPolicy;
    const useCase = new RegisterAccountUseCase(identityRepository, passwordHasher, emailSender, emailVerificationPolicy);

    const result = await useCase.execute({
      name: ' Ada Lovelace ',
      email: 'ADA@example.com ',
      password: 'a-very-long-password',
      companyName: ' Example Company ',
      companySlug: 'Example-Co',
    });

    expect(result.message).toContain('verify');
    expect(registerOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        companyName: 'Example Company',
        companySlug: 'example-co',
        emailVerifiedAt: null,
      }),
    );
    const persistedTokenHash = registerOwner.mock.calls[0][0].verificationTokenHash;
    const emailText = send.mock.calls[0][0].text;
    expect(persistedTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailText).toContain('Verify your email address');
    expect(emailText).not.toContain(persistedTokenHash);
  });

  it('skips email delivery and verifies the account when verification is disabled for development', async () => {
    const registerOwner = vi.fn().mockResolvedValue(user);
    const send = vi.fn();
    const identityRepository = { registerOwner } as unknown as IdentityRepository;
    const passwordHasher = { hash: vi.fn().mockResolvedValue('argon-hash') } as unknown as PasswordHasher;
    const emailSender = { send } as unknown as EmailSender;
    const emailVerificationPolicy = { isRequired: vi.fn().mockReturnValue(false) } as unknown as EmailVerificationPolicy;
    const useCase = new RegisterAccountUseCase(identityRepository, passwordHasher, emailSender, emailVerificationPolicy);

    const result = await useCase.execute({
      name: user.name,
      email: user.email,
      password: 'a-very-long-password',
      companyName: 'Example Company',
      companySlug: 'example-co',
    });

    expect(result.message).toContain('skipped for this environment');
    expect(registerOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerifiedAt: expect.any(Date),
        verificationTokenHash: undefined,
        verificationExpiresAt: undefined,
      }),
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('registers an invited user without creating an unrelated company', async () => {
    const registerOwner = vi.fn();
    const registerInvitedUser = vi.fn().mockResolvedValue(user);
    const identityRepository = { registerOwner, registerInvitedUser } as unknown as IdentityRepository;
    const passwordHasher = { hash: vi.fn().mockResolvedValue('argon-hash') } as unknown as PasswordHasher;
    const emailSender = { send: vi.fn().mockResolvedValue(undefined) } as unknown as EmailSender;
    const emailVerificationPolicy = { isRequired: vi.fn().mockReturnValue(true) } as unknown as EmailVerificationPolicy;
    const useCase = new RegisterAccountUseCase(identityRepository, passwordHasher, emailSender, emailVerificationPolicy);

    await useCase.execute({
      name: user.name,
      email: user.email,
      password: 'a-very-long-password',
      invitationToken: 'i'.repeat(43),
    });

    expect(registerOwner).not.toHaveBeenCalled();
    expect(registerInvitedUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: user.email,
        invitationTokenHash: hashOpaqueToken('i'.repeat(43)),
        emailVerifiedAt: null,
      }),
    );
  });

  it('blocks login until the email is verified', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue({ ...user, emailVerifiedAt: null });
    const issue = vi.fn();
    const identityRepository = {
      findUserByEmail,
    } as unknown as IdentityRepository;
    const passwordHasher = {
      verify: vi.fn().mockResolvedValue(true),
    } as unknown as PasswordHasher;
    const accessTokenIssuer = { issue } as unknown as AccessTokenIssuer;
    const useCase = new LoginUseCase(identityRepository, passwordHasher, accessTokenIssuer);

    await expect(useCase.execute({ email: user.email, password: 'password' })).rejects.toThrow(
      'Verify your email address before signing in.',
    );
    expect(issue).not.toHaveBeenCalled();
  });

  it('uses the same password verification cost when the email is unknown', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);
    const verifyUnknownPassword = vi.fn().mockResolvedValue(undefined);
    const identityRepository = { findUserByEmail } as unknown as IdentityRepository;
    const passwordHasher = { verifyUnknownPassword } as unknown as PasswordHasher;
    const accessTokenIssuer = { issue: vi.fn() } as unknown as AccessTokenIssuer;
    const useCase = new LoginUseCase(identityRepository, passwordHasher, accessTokenIssuer);

    await expect(useCase.execute({ email: user.email, password: 'password' })).rejects.toThrow(
      'Invalid email or password.',
    );
    expect(verifyUnknownPassword).toHaveBeenCalledWith('password');
  });

  it('rotates refresh tokens within the same session', async () => {
    const sessionId = 'c0a80123-4567-489a-bcde-123456789abc';
    const oldToken = `${sessionId}.${'a'.repeat(43)}`;
    const session = {
      id: sessionId,
      userId: user.id,
      activeCompanyId: 'company-1',
      tokenHash: hashOpaqueToken(oldToken),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };
    const findSessionById = vi.fn().mockResolvedValue(session);
    const rotateSession = vi.fn(async (input: {
      sessionId: string;
      expectedTokenHash: string;
      newTokenHash: string;
      expiresAt: Date;
      now: Date;
    }) => ({
        ...session,
        tokenHash: input.newTokenHash,
        expiresAt: input.expiresAt,
      }));
    const revokeSession = vi.fn();
    const identityRepository = { findSessionById, rotateSession, revokeSession } as unknown as IdentityRepository;
    const accessTokenIssuer = { issue: vi.fn().mockResolvedValue('access-token') } as unknown as AccessTokenIssuer;
    const useCase = new RefreshSessionUseCase(identityRepository, accessTokenIssuer);

    const result = await useCase.execute(oldToken);

    expect(result.refreshToken).not.toBe(oldToken);
    expect(result.refreshToken.split('.')[0]).toBe(sessionId);
    expect(rotateSession).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId, expectedTokenHash: hashOpaqueToken(oldToken) }),
    );
    expect(revokeSession).not.toHaveBeenCalled();
  });

  it('revokes a session when a rotated refresh token is reused', async () => {
    const sessionId = 'c0a80123-4567-489a-bcde-123456789abc';
    const oldToken = `${sessionId}.${'b'.repeat(43)}`;
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    const identityRepository = {
      findSessionById: vi.fn().mockResolvedValue({
        id: sessionId,
        userId: user.id,
        activeCompanyId: null,
        tokenHash: 'already-rotated-hash',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      }),
      rotateSession: vi.fn().mockResolvedValue(null),
      revokeSession,
    } as unknown as IdentityRepository;
    const accessTokenIssuer = { issue: vi.fn() } as unknown as AccessTokenIssuer;
    const useCase = new RefreshSessionUseCase(identityRepository, accessTokenIssuer);

    await expect(useCase.execute(oldToken)).rejects.toThrow(UnauthorizedException);
    expect(revokeSession).toHaveBeenCalledWith(sessionId, user.id, expect.any(Date));
  });
});

describe('company authorization guards', () => {
  it('authenticates only an active session and resolves the current company role', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    const session = {
      id: 'session-1',
      userId: user.id,
      activeCompanyId: 'company-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
    const jwtService = {
      verifyAsync: vi.fn().mockResolvedValue({
        sub: user.id,
        sid: session.id,
        activeCompanyId: session.activeCompanyId,
      }),
    };
    const config = { getOrThrow: vi.fn().mockReturnValue('a-valid-secret') };
    const identityRepository = {
      findSessionById: vi.fn().mockResolvedValue(session),
      findUserById: vi.fn().mockResolvedValue(user),
      findMembership: vi.fn().mockResolvedValue({ role: 'ADMIN' }),
    } as unknown as IdentityRepository;
    const guard = new JwtAuthenticationGuard(
      reflector,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
      identityRepository,
    );
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty('identity', {
      userId: user.id,
      sessionId: session.id,
      activeCompanyId: 'company-1',
      companyRole: 'ADMIN',
    });
  });

  it('rejects a revoked session even when the access token is valid', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
    const jwtService = {
      verifyAsync: vi.fn().mockResolvedValue({
        sub: user.id,
        sid: 'session-1',
        activeCompanyId: null,
      }),
    };
    const config = { getOrThrow: vi.fn().mockReturnValue('a-valid-secret') };
    const identityRepository = {
      findSessionById: vi.fn().mockResolvedValue({
        id: 'session-1',
        userId: user.id,
        activeCompanyId: null,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
      }),
    } as unknown as IdentityRepository;
    const guard = new JwtAuthenticationGuard(
      reflector,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
      identityRepository,
    );
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer access-token' } }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a request for a company other than the active tenant', async () => {
    const findMembership = vi.fn();
    const membershipRepository = { findMembership } as unknown as IdentityRepository;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new CompanyMembershipGuard(reflector, membershipRepository);
    const request = {
      params: { companyId: 'company-2' },
      identity: {
        userId: user.id,
        sessionId: 'session-1',
        activeCompanyId: 'company-1',
        companyRole: 'OWNER',
      } satisfies RequestIdentity,
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it('allows the selected active company only when membership exists', async () => {
    const findMembership = vi.fn().mockResolvedValue({ role: 'MEMBER' });
    const membershipRepository = { findMembership } as unknown as IdentityRepository;
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new CompanyMembershipGuard(reflector, membershipRepository);
    const request = {
      params: { companyId: 'company-1' },
      identity: {
        userId: user.id,
        sessionId: 'session-1',
        activeCompanyId: 'company-1',
        companyRole: 'OWNER',
      } satisfies RequestIdentity,
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.identity.companyRole).toBe('MEMBER');
  });

  it('rejects operations outside the current role permissions', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['OWNER', 'ADMIN']),
    } as unknown as Reflector;
    const guard = new CompanyRolesGuard(reflector);
    const request = {
      identity: {
        userId: user.id,
        sessionId: 'session-1',
        activeCompanyId: 'company-1',
        companyRole: 'MEMBER',
      } satisfies RequestIdentity,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
