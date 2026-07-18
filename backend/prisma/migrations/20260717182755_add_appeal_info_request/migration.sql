-- AlterEnum
ALTER TYPE "AppealStatus" ADD VALUE 'AWAITING_INFO';

-- AlterTable
ALTER TABLE "appeals" ADD COLUMN     "additionalInfoRequest" TEXT,
ADD COLUMN     "employeeResponse" TEXT;
