export type PublicationGateDecision = {
  allowed: boolean;
  reasons: string[];
};

export type PublicationGateInput = {
  companyId: string;
  contentId: string;
  socialAccountId: string;
  scheduleId?: string;
  videoAssetId?: string;
  checkSchedule?: boolean;
};

export abstract class PublicationGateService {
  abstract authorize(input: PublicationGateInput): Promise<PublicationGateDecision>;
}
