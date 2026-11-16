export type CompanyMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export class CompanyMember {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly companyId: string,
    public readonly role: CompanyMemberRole,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export type UserCompanyMembership = {
  companyId: string;
  companyName: string;
  companySlug: string;
  role: CompanyMemberRole;
};
