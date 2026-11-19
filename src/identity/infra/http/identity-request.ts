import { CompanyMemberRole } from '../../domain/company-member.entity.js';

export type RequestIdentity = {
  userId: string;
  sessionId: string;
  activeCompanyId: string | null;
  companyRole: CompanyMemberRole | null;
};

declare global {
  namespace Express {
    interface Request {
      identity?: RequestIdentity;
    }
  }
}
