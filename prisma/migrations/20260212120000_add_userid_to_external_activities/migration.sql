-- Step 1: Add nullable userId column
ALTER TABLE "external_activities" ADD COLUMN "userId" TEXT;

-- Step 2: Backfill from workouts
UPDATE "external_activities" ea
SET "userId" = w."userId"
FROM "workouts" w
WHERE ea."workoutId" = w."id";

-- Step 3: Delete orphans (no matching workout)
DELETE FROM "external_activities" WHERE "userId" IS NULL;

-- Step 4: Deduplicate by (userId, source, externalId), keeping the oldest
DELETE FROM "external_activities" ea
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "userId", source, "externalId"
    ORDER BY "createdAt" ASC
  ) AS rn
  FROM "external_activities"
) ranked
WHERE ea.id = ranked.id AND ranked.rn > 1;

-- Step 5: Make userId NOT NULL
ALTER TABLE "external_activities" ALTER COLUMN "userId" SET NOT NULL;

-- Step 6: Drop old index
DROP INDEX IF EXISTS "external_activities_source_externalId_idx";

-- Step 7: Create unique constraint and indexes
CREATE UNIQUE INDEX "external_activities_userId_source_externalId_key" ON "external_activities"("userId", "source", "externalId");
CREATE INDEX "external_activities_userId_source_idx" ON "external_activities"("userId", "source");

-- Step 8: Add FK constraint
ALTER TABLE "external_activities" ADD CONSTRAINT "external_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
