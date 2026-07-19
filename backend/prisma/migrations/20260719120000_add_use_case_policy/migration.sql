-- AlterEnum
ALTER TYPE "RuleAction" ADD VALUE 'REQUIRE_APPROVAL';

-- AlterEnum
ALTER TYPE "PromptStatus" ADD VALUE 'PENDING_APPROVAL';

-- CreateTable
CREATE TABLE "use_case_policies" (
    "id" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "action" "RuleAction" NOT NULL,
    "minConfidence" INTEGER NOT NULL DEFAULT 70,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "use_case_policies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "use_case_policies" ADD CONSTRAINT "use_case_policies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
