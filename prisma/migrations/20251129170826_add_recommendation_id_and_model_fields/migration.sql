-- AlterTable
ALTER TABLE "training_sessions" ADD COLUMN "recommendationId" TEXT;

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "model" TEXT;

-- CreateIndex
CREATE INDEX "training_sessions_recommendationId_idx" ON "training_sessions"("recommendationId");
