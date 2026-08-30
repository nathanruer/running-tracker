-- Lot 13 — intervalles réalisés, famille de séance, provenance (expand + migrate)
BEGIN;
DO $$ BEGIN CREATE TYPE data_source AS ENUM ('auto', 'detected', 'plan', 'manual', 'csv', 'import'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE interval_kind AS ENUM ('warmup', 'work', 'recovery', 'cooldown', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS workout_intervals (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workout_id text NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  position int NOT NULL,
  kind interval_kind NOT NULL,
  start_s int, end_s int, start_index int, end_index int,
  distance_m int, moving_s int, pace_s_km int, gap_s_km int,
  avg_hr int, max_hr int, avg_cadence real, elevation_gain_m real,
  group_key text,
  source data_source NOT NULL DEFAULT 'detected',
  external_interval_id text,
  edited_at timestamptz,
  UNIQUE (workout_id, position)
);

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS family workout_family,
  ADD COLUMN IF NOT EXISTS family_source data_source,
  ADD COLUMN IF NOT EXISTS family_confidence real,
  ADD COLUMN IF NOT EXISTS family_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS intervals_summary jsonb;

UPDATE workouts
SET family = CASE "sessionType" WHEN 'Footing' THEN 'footing'::workout_family WHEN 'Sortie longue' THEN 'long'::workout_family END,
    family_source = 'manual', family_confidence = 1
WHERE "sessionType" IN ('Footing', 'Sortie longue') AND family IS NULL;

UPDATE workouts w
SET family = CASE ps."intervalDetails"->>'workoutType'
               WHEN 'VMA' THEN 'vma_short'::workout_family
               WHEN 'SEUIL' THEN 'threshold'::workout_family
               WHEN 'TEMPO' THEN 'tempo'::workout_family END,
    family_source = 'plan', family_confidence = 0.7
FROM plan_sessions ps
WHERE ps.id = w."planSessionId" AND w."sessionType" = 'Fractionné' AND w.family IS NULL
  AND ps."intervalDetails"->>'workoutType' IN ('VMA', 'SEUIL', 'TEMPO');
CREATE INDEX IF NOT EXISTS workouts_user_family_idx ON workouts ("userId", family);
COMMIT;
