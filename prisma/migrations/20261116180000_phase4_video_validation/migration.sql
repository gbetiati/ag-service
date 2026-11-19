-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'INCONCLUSIVE', 'FAILED');

-- CreateTable
CREATE TABLE "content_validations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validatorVersion" TEXT NOT NULL,
    "summary" TEXT,
    "failureReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_results" (
    "id" TEXT NOT NULL,
    "validationId" TEXT NOT NULL,
    "checkName" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "details" JSONB,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_validations_contentId_videoAssetId_key" ON "content_validations"("contentId", "videoAssetId");

-- CreateIndex
CREATE INDEX "content_validations_companyId_status_idx" ON "content_validations"("companyId", "status");

-- CreateIndex
CREATE INDEX "validation_results_validationId_checkName_idx" ON "validation_results"("validationId", "checkName");

-- AddForeignKey
ALTER TABLE "content_validations" ADD CONSTRAINT "content_validations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_validations" ADD CONSTRAINT "content_validations_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_validations" ADD CONSTRAINT "content_validations_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "video_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "content_validations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
