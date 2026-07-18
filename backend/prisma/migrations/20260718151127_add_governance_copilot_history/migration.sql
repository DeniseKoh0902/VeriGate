-- CreateEnum
CREATE TYPE "CopilotRole" AS ENUM ('USER', 'COPILOT');

-- CreateTable
CREATE TABLE "governance_copilot_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_copilot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_copilot_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "CopilotRole" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_copilot_messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "governance_copilot_sessions" ADD CONSTRAINT "governance_copilot_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_copilot_messages" ADD CONSTRAINT "governance_copilot_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "governance_copilot_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
