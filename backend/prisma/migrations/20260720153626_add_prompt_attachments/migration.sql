-- CreateTable
CREATE TABLE "prompt_attachments" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "extractedText" TEXT,
    "isRedacted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "prompt_attachments" ADD CONSTRAINT "prompt_attachments_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Locks this new table down from Supabase's auto-generated REST API too,
-- consistent with every other application table (see the
-- enable_row_level_security migration).
ALTER TABLE "prompt_attachments" ENABLE ROW LEVEL SECURITY;
