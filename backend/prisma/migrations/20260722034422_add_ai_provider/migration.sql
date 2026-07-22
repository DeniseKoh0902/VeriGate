-- AlterEnum
ALTER TYPE "PromptStatus" ADD VALUE 'PROVIDER_NOT_CONFIGURED';

-- AlterTable
ALTER TABLE "ai_tools" ADD COLUMN     "providerId" TEXT;

-- CreateTable
CREATE TABLE "ai_providers" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "apiBaseUrl" TEXT,
    "encryptedApiKey" TEXT,
    "keyLastFour" TEXT,
    "configuredById" TEXT,
    "configuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_providers_vendor_key" ON "ai_providers"("vendor");

-- AddForeignKey
ALTER TABLE "ai_tools" ADD CONSTRAINT "ai_tools_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_configuredById_fkey" FOREIGN KEY ("configuredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
