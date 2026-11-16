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
