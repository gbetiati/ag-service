import { Injectable } from '@nestjs/common';
import {
  CompanyMemberRole as PrismaCompanyMemberRole,
  CompanyStatus,
  IdentityTokenType as PrismaIdentityTokenType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CompanyMember, CompanyMemberRole, UserCompanyMembership } from '../../domain/company-member.entity.js';
import { IdentityConflictError } from '../../domain/identity-conflict.error.js';
import { IdentityInvitationError } from '../../domain/identity-invitation.error.js';
import {
  CompanyInvitation,
  IdentityRepository,
  IdentityTokenType,
  RefreshSession,
} from '../../domain/identity.repository.interface.js';
import { User } from '../../domain/user.entity.js';

@Injectable()
export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registerOwner(input: {
    name: string;
    email: string;
    passwordHash: string;
    companyName: string;
    companySlug: string;
    emailVerifiedAt: Date | null;
    verificationTokenHash?: string;
    verificationExpiresAt?: Date;
  }): Promise<User> {
    try {
      return await this.prisma.$transaction(async transaction => {
        const company = await transaction.company.create({
          data: { name: input.companyName, slug: input.companySlug },
        });
        const user = await transaction.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash: input.passwordHash,
            emailVerifiedAt: input.emailVerifiedAt,
          },
        });
        await transaction.companyMember.create({
          data: { userId: user.id, companyId: company.id, role: PrismaCompanyMemberRole.OWNER },
        });
        if (input.verificationTokenHash && input.verificationExpiresAt) {
          await transaction.identityToken.create({
            data: {
              userId: user.id,
              tokenHash: input.verificationTokenHash,
              type: PrismaIdentityTokenType.EMAIL_VERIFICATION,
              expiresAt: input.verificationExpiresAt,
            },
          });
        }
        return this.toUser(user);
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new IdentityConflictError('The email address or company slug is already in use.');
      }
      throw error;
    }
  }

  async registerInvitedUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    invitationTokenHash: string;
    emailVerifiedAt: Date | null;
    verificationTokenHash?: string;
    verificationExpiresAt?: Date;
    now: Date;
  }): Promise<User> {
    try {
      return await this.prisma.$transaction(async transaction => {
        const invitation = await transaction.companyInvitation.findFirst({
          where: {
            tokenHash: input.invitationTokenHash,
            email: input.email,
            acceptedAt: null,
            expiresAt: { gt: input.now },
          },
        });
        if (!invitation) {
          throw new IdentityInvitationError('Invitation is invalid or expired.');
        }
        const user = await transaction.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash: input.passwordHash,
            emailVerifiedAt: input.emailVerifiedAt,
          },
        });
        if (input.verificationTokenHash && input.verificationExpiresAt) {
          await transaction.identityToken.create({
            data: {
              userId: user.id,
              tokenHash: input.verificationTokenHash,
              type: PrismaIdentityTokenType.EMAIL_VERIFICATION,
              expiresAt: input.verificationExpiresAt,
            },
          });
        }
        return this.toUser(user);
      });
    } catch (error) {
      if (error instanceof IdentityInvitationError) {
        throw error;
      }
      if (this.isUniqueConstraintError(error)) {
        throw new IdentityConflictError('The email address is already in use.');
      }
      throw error;
    }
  }

  async createCompanyForUser(input: {
    userId: string;
    name: string;
    slug: string;
    description?: string | null;
  }): Promise<UserCompanyMembership> {
    try {
      return await this.prisma.$transaction(async transaction => {
        const company = await transaction.company.create({
          data: { name: input.name, slug: input.slug, description: input.description ?? null },
        });
        await transaction.companyMember.create({
          data: { userId: input.userId, companyId: company.id, role: PrismaCompanyMemberRole.OWNER },
        });
        return {
          companyId: company.id,
          companyName: company.name,
          companySlug: company.slug,
          role: PrismaCompanyMemberRole.OWNER,
        };
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new IdentityConflictError('The company slug is already in use.');
      }
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toUser(user) : null;
  }

  async findUserById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? this.toUser(user) : null;
  }

  async updatePassword(userId: string, passwordHash: string, now: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  async createIdentityToken(input: {
    userId: string;
    type: IdentityTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.$transaction(async transaction => {
      await transaction.identityToken.deleteMany({
        where: { userId: input.userId, type: input.type, consumedAt: null },
      });
      await transaction.identityToken.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          type: this.toPrismaTokenType(input.type),
          expiresAt: input.expiresAt,
        },
      });
    });
  }

  async verifyEmail(tokenHash: string, now: Date): Promise<User | null> {
    return this.prisma.$transaction(async transaction => {
      const token = await transaction.identityToken.findFirst({
        where: {
          tokenHash,
          type: PrismaIdentityTokenType.EMAIL_VERIFICATION,
          consumedAt: null,
          expiresAt: { gt: now },
        },
      });
      if (!token) {
        return null;
      }
      const consumed = await transaction.identityToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        return null;
      }
      const user = await transaction.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: now },
      });
      return this.toUser(user);
    });
  }

  async resetPassword(tokenHash: string, passwordHash: string, now: Date): Promise<User | null> {
    return this.prisma.$transaction(async transaction => {
      const token = await transaction.identityToken.findFirst({
        where: {
          tokenHash,
          type: PrismaIdentityTokenType.PASSWORD_RESET,
          consumedAt: null,
          expiresAt: { gt: now },
        },
      });
      if (!token) {
        return null;
      }
      const consumed = await transaction.identityToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        return null;
      }
      const user = await transaction.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      });
      await transaction.refreshSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return this.toUser(user);
    });
  }

  async createSession(input: {
    id: string;
    userId: string;
    activeCompanyId: string | null;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshSession> {
    const session = await this.prisma.refreshSession.create({ data: input });
    return this.toSession(session);
  }

  async findSessionById(sessionId: string): Promise<RefreshSession | null> {
    const session = await this.prisma.refreshSession.findUnique({ where: { id: sessionId } });
    return session ? this.toSession(session) : null;
  }

  async rotateSession(input: {
    sessionId: string;
    expectedTokenHash: string;
    newTokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<RefreshSession | null> {
    const updated = await this.prisma.refreshSession.updateMany({
      where: {
        id: input.sessionId,
        tokenHash: input.expectedTokenHash,
        revokedAt: null,
        expiresAt: { gt: input.now },
      },
      data: { tokenHash: input.newTokenHash, expiresAt: input.expiresAt },
    });
    if (updated.count !== 1) {
      return null;
    }
    const session = await this.prisma.refreshSession.findUnique({ where: { id: input.sessionId } });
    return session ? this.toSession(session) : null;
  }

  async revokeSession(sessionId: string, userId: string, now: Date): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeSessionById(sessionId: string, now: Date): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeAllSessions(userId: string, now: Date): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async selectCompany(input: {
    sessionId: string;
    userId: string;
    companyId: string;
    now: Date;
  }): Promise<RefreshSession | null> {
    return this.prisma.$transaction(async transaction => {
      const membership = await transaction.companyMember.findUnique({
        where: {
          userId_companyId: { userId: input.userId, companyId: input.companyId },
          company: { is: { status: CompanyStatus.ACTIVE } },
        },
      });
      if (!membership) {
        return null;
      }
      const updated = await transaction.refreshSession.updateMany({
        where: {
          id: input.sessionId,
          userId: input.userId,
          revokedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { activeCompanyId: input.companyId },
      });
      if (updated.count !== 1) {
        return null;
      }
      const session = await transaction.refreshSession.findUnique({ where: { id: input.sessionId } });
      return session ? this.toSession(session) : null;
    });
  }

  async findMembership(userId: string, companyId: string): Promise<CompanyMember | null> {
    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId,
        company: { is: { status: CompanyStatus.ACTIVE } },
      },
    });
    return membership ? this.toMember(membership) : null;
  }

  async listMemberships(userId: string): Promise<UserCompanyMembership[]> {
    const memberships = await this.prisma.companyMember.findMany({
      where: { userId, company: { is: { status: CompanyStatus.ACTIVE } } },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(membership => ({
      companyId: membership.companyId,
      companyName: membership.company.name,
      companySlug: membership.company.slug,
      role: membership.role,
    }));
  }

  async createInvitation(input: {
    companyId: string;
    invitedByUserId: string;
    email: string;
    role: CompanyMemberRole;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<CompanyInvitation> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingUser) {
      const membership = await this.prisma.companyMember.findUnique({
        where: { userId_companyId: { userId: existingUser.id, companyId: input.companyId } },
        select: { id: true },
      });
      if (membership) {
        throw new IdentityConflictError('This user is already a member of the company.');
      }
    }
    await this.prisma.companyInvitation.deleteMany({
      where: { companyId: input.companyId, email: input.email, acceptedAt: null },
    });
    const invitation = await this.prisma.companyInvitation.create({ data: input });
    return this.toInvitation(invitation);
  }

  async acceptInvitation(input: {
    tokenHash: string;
    userId: string;
    email: string;
    now: Date;
  }): Promise<CompanyMember | null> {
    return this.prisma.$transaction(async transaction => {
      const invitation = await transaction.companyInvitation.findFirst({
        where: {
          tokenHash: input.tokenHash,
          email: input.email,
          acceptedAt: null,
          expiresAt: { gt: input.now },
        },
      });
      if (!invitation) {
        return null;
      }
      const existing = await transaction.companyMember.findUnique({
        where: {
          userId_companyId: { userId: input.userId, companyId: invitation.companyId },
        },
      });
      if (existing) {
        return null;
      }
      const accepted = await transaction.companyInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: input.now } },
        data: { acceptedAt: input.now },
      });
      if (accepted.count !== 1) {
        return null;
      }
      const membership = await transaction.companyMember.create({
        data: {
          userId: input.userId,
          companyId: invitation.companyId,
          role: invitation.role,
        },
      });
      return this.toMember(membership);
    });
  }

  private toUser(record: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      record.id,
      record.name,
      record.email,
      record.passwordHash,
      record.emailVerifiedAt,
      record.createdAt,
      record.updatedAt,
    );
  }

  private toSession(record: {
    id: string;
    userId: string;
    activeCompanyId: string | null;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }): RefreshSession {
    return {
      id: record.id,
      userId: record.userId,
      activeCompanyId: record.activeCompanyId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
    };
  }

  private toMember(record: {
    id: string;
    userId: string;
    companyId: string;
    role: PrismaCompanyMemberRole;
    createdAt: Date;
    updatedAt: Date;
  }): CompanyMember {
    return new CompanyMember(
      record.id,
      record.userId,
      record.companyId,
      record.role as CompanyMemberRole,
      record.createdAt,
      record.updatedAt,
    );
  }

  private toInvitation(record: {
    id: string;
    companyId: string;
    email: string;
    role: PrismaCompanyMemberRole;
    expiresAt: Date;
    acceptedAt: Date | null;
  }): CompanyInvitation {
    return {
      id: record.id,
      companyId: record.companyId,
      email: record.email,
      role: record.role as CompanyMemberRole,
      expiresAt: record.expiresAt,
      acceptedAt: record.acceptedAt,
    };
  }

  private toPrismaTokenType(type: IdentityTokenType): PrismaIdentityTokenType {
    return PrismaIdentityTokenType[type];
  }

  private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
