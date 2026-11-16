export type PublicationGateDecision = {
  allowed: boolean;
  reasons: string[];
};

export abstract class PublicationGateService {
  abstract authorize(input: {
    companyId: string;
    contentId: string;
    socialAccountId: string;
  }): Promise<PublicationGateDecision>;
}
