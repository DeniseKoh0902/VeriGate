-- AlterTable
ALTER TABLE "ai_tools" ADD COLUMN     "decisionNotes" TEXT;

-- AlterTable
ALTER TABLE "ai_trust_evaluations" ADD COLUMN     "availabilityReason" TEXT,
ADD COLUMN     "complianceReason" TEXT,
ADD COLUMN     "explainabilityReason" TEXT,
ADD COLUMN     "justification" TEXT,
ADD COLUMN     "orgPolicyReason" TEXT,
ADD COLUMN     "privacyReason" TEXT,
ADD COLUMN     "securityReason" TEXT;
