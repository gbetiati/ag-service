import { CompanyMember, CompanyMemberRole, UserCompanyMembership } from './company-member.entity.js';
import { User } from './user.entity.js';

export type IdentityTokenType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export type RefreshSession = {
  id: string;
  userId: string;
  activeCompanyId: string | null;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type CompanyInvitation = {
  id: string;
  companyId: string;
  email: string;
  role: CompanyMemberRole;
  expiresAt: Date;
  acceptedAt: Date | null;
};

export abstract class IdentityRepository {
  abstract registerOwner(input: {
    name: string;
    email: string;
    passwordHash: string;
    companyName: string;
    companySlug: string;
    emailVerifiedAt: Date | null;
    verificationTokenHash?: string;
    verificationExpiresAt?: Date;
  }): Promise<User>;
  abstract registerInvitedUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    invitationTokenHash: string;
    emailVerifiedAt: Date | null;
    verificationTokenHash?: string;
    verificationExpiresAt?: Date;
    now: Date;
  }): Promise<User>;
  abstract createCompanyForUser(input: {
    userId: string;
    name: string;
    slug: string;
    description?: string | null;
  }): Promise<UserCompanyMembership>;
  abstract findUserByEmail(email: string): Promise<User | null>;
  abstract findUserById(userId: string): Promise<User | null>;
  abstract updatePassword(userId: string, passwordHash: string, now: Date): Promise<void>;
  abstract createIdentityToken(input: {
    userId: string;
    type: IdentityTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  abstract verifyEmail(tokenHash: string, now: Date): Promise<User | null>;
  abstract resetPassword(tokenHash: string, passwordHash: string, now: Date): Promise<User | null>;
  abstract createSession(input: {
    id: string;
    userId: string;
    activeCompanyId: string | null;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshSession>;
  abstract findSessionById(sessionId: string): Promise<RefreshSession | null>;
  abstract rotateSession(input: {
    sessionId: string;
    expectedTokenHash: string;
    newTokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<RefreshSession | null>;
  abstract revokeSession(sessionId: string, userId: string, now: Date): Promise<void>;
  abstract revokeSessionById(sessionId: string, now: Date): Promise<void>;
  abstract revokeAllSessions(userId: string, now: Date): Promise<void>;
  abstract selectCompany(input: {
    sessionId: string;
    userId: string;
    companyId: string;
    now: Date;
  }): Promise<RefreshSession | null>;
  abstract findMembership(userId: string, companyId: string): Promise<CompanyMember | null>;
  abstract listMemberships(userId: string): Promise<UserCompanyMembership[]>;
  abstract createInvitation(input: {
    companyId: string;
    invitedByUserId: string;
    email: string;
    role: CompanyMemberRole;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<CompanyInvitation>;
  abstract acceptInvitation(input: {
    tokenHash: string;
    userId: string;
    email: string;
    now: Date;
  }): Promise<CompanyMember | null>;
}
