CREATE TYPE "VideoGenerationStatus" AS ENUM ('QUEUED', 'RENDERING', 'READY', 'FAILED');

CREATE TABLE "video_generations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "VideoGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "renderJobId" TEXT,
    "videoAssetId" TEXT,
    "request" JSONB NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_generations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "video_generations_videoAssetId_key" ON "video_generations"("videoAssetId");
CREATE INDEX "video_generations_companyId_status_idx" ON "video_generations"("companyId", "status");
CREATE INDEX "video_generations_contentId_createdAt_idx" ON "video_generations"("contentId", "createdAt");

ALTER TABLE "video_generations"
ADD CONSTRAINT "video_generations_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_generations"
ADD CONSTRAINT "video_generations_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_generations"
ADD CONSTRAINT "video_generations_videoAssetId_fkey"
FOREIGN KEY ("videoAssetId") REFERENCES "video_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
