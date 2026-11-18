CREATE TYPE "ApprovalMode" AS ENUM ('MANUAL', 'AUTOMATIC');

ALTER TABLE "companies"
ADD COLUMN "approvalMode" "ApprovalMode" NOT NULL DEFAULT 'MANUAL';
