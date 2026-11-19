-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM');
CREATE TYPE "SocialAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'QUEUED', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'REJECTED');

CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "accountHandle" TEXT NOT NULL,
    "displayName" TEXT,
    "status" "SocialAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_credentials" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "initializationVector" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "scopes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalPostId" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publication_attempts" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'QUEUED',
    "providerResponse" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "publication_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_accounts_companyId_platform_accountHandle_key"
ON "social_accounts"("companyId", "platform", "accountHandle");
CREATE INDEX "social_credentials_socialAccountId_kind_idx"
ON "social_credentials"("socialAccountId", "kind");
CREATE UNIQUE INDEX "publications_contentId_socialAccountId_key"
ON "publications"("contentId", "socialAccountId");
CREATE INDEX "publications_companyId_status_idx"
ON "publications"("companyId", "status");
CREATE INDEX "publication_attempts_publicationId_attemptNumber_idx"
ON "publication_attempts"("publicationId", "attemptNumber");

ALTER TABLE "social_accounts"
ADD CONSTRAINT "social_accounts_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_credentials"
ADD CONSTRAINT "social_credentials_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_credentials"
ADD CONSTRAINT "social_credentials_socialAccountId_fkey"
FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "publications"
ADD CONSTRAINT "publications_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "publications"
ADD CONSTRAINT "publications_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "publications"
ADD CONSTRAINT "publications_socialAccountId_fkey"
FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "publication_attempts"
ADD CONSTRAINT "publication_attempts_publicationId_fkey"
FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
