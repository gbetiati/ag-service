import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SocialPublisher,
  SocialPublishMediaType,
  SocialPublishResult,
} from '../../domain/social-publisher.interface.js';
import { SocialCredential } from '../../domain/social-credential.entity.js';
import { CredentialEncryptionService } from '../services/credential-encryption.service.js';

@Injectable()
export class InstagramPublisher extends SocialPublisher {
  private readonly logger = new Logger(InstagramPublisher.name);

  constructor(
    private readonly credentialEncryptionService: CredentialEncryptionService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async publish(input: {
    companyId: string;
    contentId: string;
    publication: { id: string; contentId: string; socialAccountId: string };
    socialAccount: { id: string; platform: string; accountHandle: string };
    credential: SocialCredential;
    caption?: string | null;
    mediaUrl?: string | null;
    mediaType?: SocialPublishMediaType;
  }): Promise<SocialPublishResult> {
    const accessToken = this.credentialEncryptionService.decrypt(
      input.credential.encryptedValue,
      input.credential.initializationVector,
    );

    if (!accessToken || accessToken.length < 10) {
      throw new Error('Instagram credential is invalid or missing.');
    }

    const igUserId = input.socialAccount.accountHandle;
    const mediaUrl =
      input.mediaUrl
      ?? this.configService.get<string>('INSTAGRAM_TEST_IMAGE_URL')
      ?? null;
    if (!mediaUrl) {
      throw new Error(
        'No public media URL available for Instagram publish. Set INSTAGRAM_TEST_IMAGE_URL or attach a public asset to the content.',
      );
    }

    const mediaType = input.mediaType ?? this.inferMediaType(mediaUrl);
    const caption = input.caption ?? `Content ${input.contentId}`;
    const graphBase = this.graphBaseUrl();

    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return {
        externalPostId: `mock-instagram-${input.contentId}`,
        metadata: {
          platform: 'INSTAGRAM',
          igUserId,
          mode: 'mock',
          mediaType,
          mediaUrl,
        },
      };
    }

    const containerId = await this.createMediaContainer({
      graphBase,
      igUserId,
      accessToken,
      mediaUrl,
      mediaType,
      caption,
    });

    await this.waitForContainerReady({ graphBase, containerId, accessToken });

    const published = await this.publishContainer({
      graphBase,
      igUserId,
      accessToken,
      creationId: containerId,
    });

    return {
      externalPostId: published.id,
      metadata: {
        platform: 'INSTAGRAM',
        igUserId,
        mediaType,
        mediaUrl,
        containerId,
        creationId: containerId,
      },
    };
  }

  private async createMediaContainer(input: {
    graphBase: string;
    igUserId: string;
    accessToken: string;
    mediaUrl: string;
    mediaType: SocialPublishMediaType;
    caption: string;
  }): Promise<string> {
    const url = new URL(`${input.graphBase}/${input.igUserId}/media`);
    url.searchParams.set('access_token', input.accessToken);
    url.searchParams.set('caption', input.caption);

    if (input.mediaType === 'IMAGE') {
      url.searchParams.set('image_url', input.mediaUrl);
    } else {
      url.searchParams.set('media_type', input.mediaType === 'REELS' ? 'REELS' : 'VIDEO');
      url.searchParams.set('video_url', input.mediaUrl);
    }

    const payload = await this.postForm<{ id?: string; error?: { message?: string } }>(url);
    if (!payload.id) {
      throw new Error(payload.error?.message ?? 'Instagram media container creation failed.');
    }
    return payload.id;
  }

  private async waitForContainerReady(input: {
    graphBase: string;
    containerId: string;
    accessToken: string;
  }): Promise<void> {
    const maxAttempts = Number(this.configService.get<string>('INSTAGRAM_CONTAINER_POLL_ATTEMPTS') ?? 30);
    const delayMs = Number(this.configService.get<string>('INSTAGRAM_CONTAINER_POLL_DELAY_MS') ?? 2000);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const url = new URL(`${input.graphBase}/${input.containerId}`);
      url.searchParams.set('fields', 'status_code');
      url.searchParams.set('access_token', input.accessToken);

      const payload = await this.getJson<{ status_code?: string; error?: { message?: string } }>(url);
      const status = payload.status_code ?? 'FINISHED';

      if (status === 'FINISHED') {
        return;
      }
      if (status === 'ERROR' || status === 'EXPIRED') {
        throw new Error(`Instagram media container failed with status ${status}.`);
      }

      this.logger.debug(`Waiting for Instagram container ${input.containerId}: ${status}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('Instagram media container was not ready before timeout.');
  }

  private async publishContainer(input: {
    graphBase: string;
    igUserId: string;
    accessToken: string;
    creationId: string;
  }): Promise<{ id: string }> {
    const url = new URL(`${input.graphBase}/${input.igUserId}/media_publish`);
    url.searchParams.set('creation_id', input.creationId);
    url.searchParams.set('access_token', input.accessToken);

    const payload = await this.postForm<{ id?: string; error?: { message?: string } }>(url);
    if (!payload.id) {
      throw new Error(payload.error?.message ?? 'Instagram media_publish failed.');
    }
    return { id: payload.id };
  }

  private inferMediaType(mediaUrl: string): SocialPublishMediaType {
    const lower = mediaUrl.toLowerCase();
    if (lower.includes('.mp4') || lower.includes('.mov') || lower.includes('video')) {
      return 'REELS';
    }
    return 'IMAGE';
  }

  private graphBaseUrl(): string {
    const version = this.configService.get<string>('META_GRAPH_API_VERSION') ?? 'v21.0';
    const host = this.configService.get<string>('INSTAGRAM_API_BASE_URL') ?? 'https://graph.facebook.com';
    return `${host.replace(/\/$/, '')}/${version.replace(/^\//, '')}`;
  }

  private async postForm<T>(url: URL): Promise<T> {
    const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(60_000) });
    const payload = (await response.json()) as T & { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Instagram Graph POST failed (${response.status}).`);
    }
    return payload;
  }

  private async getJson<T>(url: URL): Promise<T> {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const payload = (await response.json()) as T & { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Instagram Graph GET failed (${response.status}).`);
    }
    return payload;
  }
}
