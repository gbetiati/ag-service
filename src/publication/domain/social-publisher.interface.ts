import { Publication } from './publication.entity.js';
import { SocialAccount } from './social-account.entity.js';
import { SocialCredential } from './social-credential.entity.js';

export type SocialPublishMediaType = 'IMAGE' | 'REELS' | 'VIDEO';

export type SocialPublishResult = {
  externalPostId: string;
  metadata?: Record<string, unknown>;
};

export abstract class SocialPublisher {
  abstract publish(input: {
    companyId: string;
    contentId: string;
    publication: Publication;
    socialAccount: SocialAccount;
    credential: SocialCredential;
    caption?: string | null;
    mediaUrl?: string | null;
    mediaType?: SocialPublishMediaType;
  }): Promise<SocialPublishResult>;
}
