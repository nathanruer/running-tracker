-- Remove unused maxElevation and minElevation columns
ALTER TABLE "public"."training_sessions"
DROP COLUMN IF EXISTS "maxElevation",
DROP COLUMN IF EXISTS "minElevation";
