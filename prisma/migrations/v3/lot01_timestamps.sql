-- Lot 1 — horodatage réel et fuseaux (expand + migrate, additif)
BEGIN;
DO $$ BEGIN CREATE TYPE date_precision AS ENUM ('instant', 'day'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS date_precision date_precision;

UPDATE workouts w
SET started_at = ea."startedAt" AT TIME ZONE 'UTC', timezone = 'Europe/Paris', date_precision = 'instant'
FROM external_activities ea
WHERE ea."workoutId" = w.id AND ea."startedAt" IS NOT NULL AND w.started_at IS NULL;

UPDATE workouts
SET started_at = date_trunc('day', date) AT TIME ZONE 'Europe/Paris', timezone = 'Europe/Paris', date_precision = 'day'
WHERE started_at IS NULL;

ALTER TABLE workouts
  ALTER COLUMN started_at SET NOT NULL,
  ALTER COLUMN timezone SET NOT NULL,
  ALTER COLUMN date_precision SET NOT NULL;
CREATE INDEX IF NOT EXISTS workouts_user_started_idx ON workouts ("userId", started_at DESC);

ALTER TABLE workouts ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE plan_sessions ALTER COLUMN "plannedDate" TYPE timestamptz USING "plannedDate" AT TIME ZONE 'UTC', ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE external_activities ALTER COLUMN "startedAt" TYPE timestamptz USING "startedAt" AT TIME ZONE 'UTC', ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE external_payloads ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE workout_streams ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE workout_stream_chunks ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE weather_observations ALTER COLUMN "observedAt" TYPE timestamptz USING "observedAt" AT TIME ZONE 'UTC', ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE conversations ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE conversation_messages ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE conversation_message_payloads ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE users ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE user_profiles ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE user_preferences ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE external_accounts ALTER COLUMN "tokenExpiresAt" TYPE timestamptz USING "tokenExpiresAt" AT TIME ZONE 'UTC', ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';
COMMIT;
