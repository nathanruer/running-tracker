-- Lot 6 — séances planifiées v3 (table ; la conversion des lignes est faite par scripts/db-v3/convert-planned.mjs)
BEGIN;
DO $$ BEGIN CREATE TYPE planned_origin AS ENUM ('coach', 'manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE plan_status AS ENUM ('planned', 'completed', 'skipped', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE workout_family AS ENUM ('footing', 'long', 'fartlek', 'vma_short', 'vma_long', 'threshold', 'tempo', 'specific', 'hills', 'recovery', 'race', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS planned_workouts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  legacy_plan_session_id text UNIQUE,
  planned_on date,
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  family workout_family,
  structure jsonb NOT NULL,
  schema_version int NOT NULL DEFAULT 3,
  structure_legacy jsonb,
  target_duration_s int,
  target_distance_m int,
  target_pace_s_km int,
  target_hr_bpm int,
  target_rpe int,
  origin planned_origin NOT NULL DEFAULT 'manual',
  recommendation_id text,
  training_week_id text,
  status plan_status NOT NULL DEFAULT 'planned',
  notes text NOT NULL DEFAULT '',
  session_number int,
  workout_id text UNIQUE REFERENCES workouts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS planned_workouts_user_planned_idx ON planned_workouts (user_id, planned_on);
CREATE INDEX IF NOT EXISTS planned_workouts_user_status_idx ON planned_workouts (user_id, status);
COMMIT;
