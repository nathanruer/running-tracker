-- Lot 8 — état athlète calculé (table ; remplie par le moteur en phase 8.1)
BEGIN;
CREATE TABLE IF NOT EXISTS athlete_states (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  as_of date NOT NULL,
  vma_kmh real, vma_confidence text, vma_method text, vma_measured_at date,
  zones jsonb,
  ctl real, atl real, tsb real, acwr real, monotony real,
  days_since_last int, break_weeks int,
  habits jsonb, family_share jsonb, tolerance jsonb,
  schema_version int NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS athlete_states_user_computed_idx ON athlete_states (user_id, computed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS athlete_states_user_asof_key ON athlete_states (user_id, as_of);
COMMIT;
