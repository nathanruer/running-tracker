-- Drop legacy Strava/user profile fields from users
DROP INDEX IF EXISTS "users_stravaId_key";

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "stravaAccessToken",
  DROP COLUMN IF EXISTS "stravaId",
  DROP COLUMN IF EXISTS "stravaRefreshToken",
  DROP COLUMN IF EXISTS "stravaTokenExpiresAt",
  DROP COLUMN IF EXISTS "age",
  DROP COLUMN IF EXISTS "maxHeartRate",
  DROP COLUMN IF EXISTS "weight",
  DROP COLUMN IF EXISTS "vma",
  DROP COLUMN IF EXISTS "goal";
