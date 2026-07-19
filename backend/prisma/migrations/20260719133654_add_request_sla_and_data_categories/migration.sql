-- AlterTable
ALTER TABLE "ai_tool_requests" ADD COLUMN     "dataCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "slaDeadline" TIMESTAMP(3);
