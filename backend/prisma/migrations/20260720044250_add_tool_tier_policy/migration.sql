-- CreateTable
CREATE TABLE "tool_tier_policies" (
    "id" TEXT NOT NULL,
    "toolTier" "AiToolRiskTier" NOT NULL,
    "category" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "action" "RuleAction" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_tier_policies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tool_tier_policies" ADD CONSTRAINT "tool_tier_policies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
