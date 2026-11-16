import { Injectable } from '@nestjs/common';
import { SocialPublisher, SocialPublishResult } from '../../domain/social-publisher.interface.js';
import { SocialCredential } from '../../domain/social-credential.entity.js';
import { CredentialEncryptionService } from '../services/credential-encryption.service.js';

@Injectable()
export class InstagramPublisher extends SocialPublisher {
  constructor(private readonly credentialEncryptionService: CredentialEncryptionService) {
    super();
  }

  async publish(input: {
    companyId: string;
    contentId: string;
    publication: { id: string; contentId: string; socialAccountId: string };
    socialAccount: { id: string; platform: string; accountHandle: string };
    credential: SocialCredential;
  }): Promise<SocialPublishResult> {
    const secret = this.credentialEncryptionService.decrypt(
      input.credential.encryptedValue,
      input.credential.initializationVector,
    );

    if (!secret || secret.length < 10) {
      throw new Error('Instagram credential is invalid or missing.');
    }

    const baseUrl = process.env.INSTAGRAM_API_BASE_URL ?? 'https://graph.facebook.com';
    const accountId = input.socialAccount.accountHandle;
    const endpoint = `${baseUrl}/v19.0/${accountId}/media`;

    if (process.env.NODE_ENV === 'test' || !process.env.INSTAGRAM_ACCESS_TOKEN) {
      return {
        externalPostId: `mock-instagram-${input.contentId}`,
        metadata: {
          platform: 'INSTAGRAM',
          accountId,
          mode: 'mock',
          endpoint,
          credentialKind: input.credential.kind,
        },
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: secret,
        media_type: 'REELS',
        media_url: `https://example.com/content/${input.contentId}.mp4`,
        caption: `Content ${input.contentId}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Instagram API request failed: ${errorText}`);
    }

    const payload = (await response.json()) as { id?: string };
    return {
      externalPostId: payload.id ?? `instagram-${input.contentId}`,
      metadata: {
        platform: 'INSTAGRAM',
        accountId,
        endpoint,
      },
    };
  }
}
