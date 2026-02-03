-- Remove legacySessionId now that legacy IDs are no longer accepted.
DROP INDEX IF EXISTS "plan_sessions_legacySessionId_idx";
DROP INDEX IF EXISTS "workouts_legacySessionId_idx";

ALTER TABLE "plan_sessions" DROP COLUMN IF EXISTS "legacySessionId";
ALTER TABLE "workouts" DROP COLUMN IF EXISTS "legacySessionId";
