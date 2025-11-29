-- AlterTable
ALTER TABLE "training_sessions" ADD COLUMN     "plannedDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN     "targetDistance" DOUBLE PRECISION,
ADD COLUMN     "targetDuration" INTEGER,
ADD COLUMN     "targetHeartRateZone" TEXT,
ADD COLUMN     "targetPace" TEXT,
ADD COLUMN     "targetRPE" INTEGER;

-- CreateIndex
CREATE INDEX "training_sessions_status_idx" ON "training_sessions"("status");
