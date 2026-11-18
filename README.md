# ag-service

## Identity and authentication

The API uses bearer access tokens (15 minutes) and rotating opaque refresh tokens (30 days). Passwords are hashed with Argon2id. Registration creates a company and its first `OWNER`; the email address must be verified before login. Refresh tokens and one-time verification/reset tokens are stored only as SHA-256 hashes.

Configure `JWT_ACCESS_SECRET` with at least 32 random characters. When `IDENTITY_EMAIL_VERIFICATION_REQUIRED=true` (the default), configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for registration, verification, invitations, or password recovery. These settings are shown as placeholders in `.env.example`.

For local development only, set `IDENTITY_EMAIL_VERIFICATION_REQUIRED=false` to create verified accounts without sending email. The application rejects this setting in production.

Authentication endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Register the first user and company; invited users may include `invitationToken` instead of company details |
| POST | `/auth/login` | Sign in with email and password |
| POST | `/auth/refresh` | Rotate a refresh token |
| POST | `/auth/logout` | Revoke the current session |
| GET | `/auth/me` | Return the authenticated user and memberships |
| POST | `/auth/email/verify` | Verify an email using its one-time token |
| POST | `/auth/email/verification/request` | Request another verification email |
| POST | `/auth/password/forgot` | Request a one-time password reset token |
| POST | `/auth/password/reset` | Set a new password and revoke all sessions |
| POST | `/auth/companies/:companyId/select` | Change the active company for the current session |
| POST | `/auth/invitations` | Invite a user as `ADMIN` or `MEMBER` (OWNER/ADMIN only) |
| POST | `/auth/invitations/accept` | Accept an invitation with a verified account |

`GET /companies` lists only the authenticated user's memberships. `POST /companies` creates a company and assigns the authenticated user as its `OWNER`. Company-scoped endpoints require the active company in the access token and a current membership; authorization checks are enforced server-side. The `OWNER`, `ADMIN`, and `MEMBER` roles are persisted for RBAC.

`OWNER` has full company access. `ADMIN` and `OWNER` can manage brands/products, social accounts and credentials, publication approval, scheduling, and invitations. `MEMBER` can use content, media, video generation/validation, and read operations but cannot perform those administrative actions.

Apply the Prisma migrations with the deployment's normal migration process before starting the API. Existing companies created before Identity have no owner membership automatically; provision memberships through a trusted operator before those tenants can access their data.

## Video generation jobs

Video generation requests create a `VideoGeneration` record with status `QUEUED` and add its ID to the BullMQ `video-generation` queue. The worker calls the provider and polls a pending render on delayed jobs until it completes (or one hour elapses). Only after the rendered file is stored does it create the final `VideoAsset`, mark the generation `READY`, and enqueue validation using that asset ID. The NestJS application runs the queue worker; configure `REDIS_HOST`, `REDIS_PORT`, and optionally `VIDEO_GENERATION_CONCURRENCY` for the worker and queue connection. Jobs are retried up to three times, and completed/failed jobs are retained temporarily for inspection.

`GET /companies/:companyId/video-generation/jobs` returns generation records for that company with their BullMQ job states and failure reasons, when the jobs are still retained. Check a generation with `GET /companies/:companyId/content/:contentId/video-generation/:videoGenerationId/status`. Renders that remain in the external provider's `QUEUED`/`RENDERING` state are rechecked by delayed queue jobs every 10 seconds, for up to one hour. The existing `POST .../:videoAssetId/render` endpoint remains available for a manual refresh of an already-created asset.

The Creatomate provider submits a render directly from a generated vertical-video source; a Creatomate template is not required. It uses the selected `sourceMediaAssetIds`, or the content product's image assets when none are specified. The worker validates that every image belongs to the requesting company. Configure `CREATOMATE_API_KEY`, `PUBLIC_API_BASE_URL` (the publicly reachable HTTPS base URL of this API), and `MEDIA_ASSET_URL_SECRET` (a random secret of at least 32 characters). Images in the local storage provider are served to Creatomate through short-lived HMAC-signed URLs at `GET /media-assets/:mediaAssetId/public`; do not expose the storage directory itself. The API must be reachable by Creatomate over HTTPS. The finished video is streamed from Creatomate into storage instead of being buffered in Node.js memory. Missing configuration, inaccessible/invalid image assets, API errors, failed renders, and empty downloads fail the generation rather than creating a fake video asset.

## Validation, approval, and publication workflow

The workflow is: video render and storage -> `video-validation` BullMQ worker -> approval -> PostgreSQL `Publication` schedule -> delayed `social-publishing` BullMQ job -> publishing worker. The existing `Publication` row is the persisted schedule record; it contains the company, content, social account/platform, status, and `scheduledFor`, so a duplicate schedule table is not used.

When a video asset reaches `READY` with a storage key, generation enqueues validation by the persisted `videoAssetId`. Validation requires a stored, ready asset and is retryable. Company approval defaults to manual; `PATCH /companies/:companyId/approval-mode` with `{ "approvalMode": "MANUAL" }` or `{ "approvalMode": "AUTOMATIC" }` configures it for `OWNER`/`ADMIN`. Automatic approval happens only when validation is `APPROVED`; manual approval is also blocked until validation passes.

Create a publication only after approval and validation. Schedule it with `POST /companies/:companyId/scheduling/publications/:publicationId/schedule`; the PostgreSQL row is updated before BullMQ receives a delayed job. `POST /companies/:companyId/content/:contentId/publish` queues an immediate publication rather than calling the social provider in the HTTP request. The `social-publishing` worker rechecks persisted state and the publication gate before invoking the publisher. Configure optional worker concurrency with `VIDEO_VALIDATION_CONCURRENCY` and `SOCIAL_PUBLISHING_CONCURRENCY`.

The orchestration does not make every external integration production-ready by itself: `InstagramPublisher` still uses mock/example media behavior unless a real publishing integration is completed.
