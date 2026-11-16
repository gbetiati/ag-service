CREATE TABLE "automation_states" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "queueName" TEXT NOT NULL,
  "paused" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "automation_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "automation_states_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "automation_states_companyId_queueName_key"
  ON "automation_states"("companyId", "queueName");
