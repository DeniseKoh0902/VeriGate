-- CreateEnum
CREATE TYPE "ScanTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateTable
CREATE TABLE "ai_tool_usage_scans" (
    "id" TEXT NOT NULL,
    "aiToolId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "promptCount" INTEGER NOT NULL,
    "blockRate" DOUBLE PRECISION NOT NULL,
    "sensitiveDataMatchRate" DOUBLE PRECISION NOT NULL,
    "isDriftFlagged" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "triggeredBy" "ScanTrigger" NOT NULL,
    "triggeredById" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_tool_usage_scans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ai_tool_usage_scans" ADD CONSTRAINT "ai_tool_usage_scans_aiToolId_fkey" FOREIGN KEY ("aiToolId") REFERENCES "ai_tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_tool_usage_scans" ADD CONSTRAINT "ai_tool_usage_scans_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
