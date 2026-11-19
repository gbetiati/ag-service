-- CreateEnum
CREATE TYPE "ScheduledPublicationStage" AS ENUM ('PREPARE', 'RENDER', 'VALIDATE', 'APPROVAL', 'PUBLISH', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'RECONCILIATION_REQUIRED');

-- CreateTable
CREATE TABLE "scheduled_publications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "stage" "ScheduledPublicationStage" NOT NULL DEFAULT 'PREPARE',
    "nextRunAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "contentIdeaId" TEXT,
    "generationId" TEXT,
    "revision" TEXT,
    "approvedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_publications_publicationId_key" ON "scheduled_publications"("publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_publications_generationId_key" ON "scheduled_publications"("generationId");

-- CreateIndex
CREATE INDEX "scheduled_publications_nextRunAt_idx" ON "scheduled_publications"("nextRunAt");

-- CreateIndex
CREATE INDEX "scheduled_publications_companyId_contentId_idx" ON "scheduled_publications"("companyId", "contentId");

-- AddForeignKey
ALTER TABLE "scheduled_publications" ADD CONSTRAINT "scheduled_publications_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_publications" ADD CONSTRAINT "scheduled_publications_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_publications" ADD CONSTRAINT "scheduled_publications_contentIdeaId_fkey" FOREIGN KEY ("contentIdeaId") REFERENCES "content_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_publications" ADD CONSTRAINT "scheduled_publications_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "video_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A single active revision owns the mutable content at a time.
CREATE UNIQUE INDEX "scheduled_publications_active_content_key"
ON "scheduled_publications"("contentId")
WHERE "stage" NOT IN ('PUBLISHED', 'FAILED');
