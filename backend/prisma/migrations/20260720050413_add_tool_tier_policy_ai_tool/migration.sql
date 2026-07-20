-- AlterTable
ALTER TABLE "tool_tier_policies" ADD COLUMN     "aiToolId" TEXT;

-- AddForeignKey
ALTER TABLE "tool_tier_policies" ADD CONSTRAINT "tool_tier_policies_aiToolId_fkey" FOREIGN KEY ("aiToolId") REFERENCES "ai_tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
