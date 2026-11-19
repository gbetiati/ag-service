ALTER TABLE "scheduled_publications"
ADD COLUMN "scriptResponseId" TEXT,
ADD COLUMN "scriptRevision" TEXT,
ADD COLUMN "providerNotified" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "scheduled_publications_scriptResponseId_key" ON "scheduled_publications"("scriptResponseId");
