-- Lot 7 — profil athlète étendu + objectifs (additif)
BEGIN;
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS units text,
  ADD COLUMN IF NOT EXISTS available_days jsonb,
  ADD COLUMN IF NOT EXISTS rest_hr int,
  ADD COLUMN IF NOT EXISTS constraints jsonb,
  ADD COLUMN IF NOT EXISTS goal_note text;
UPDATE user_profiles p SET timezone = COALESCE(pr.timezone, 'Europe/Paris'), units = COALESCE(pr.units, 'metric')
FROM user_preferences pr WHERE pr."userId" = p."userId";
UPDATE user_profiles SET timezone = COALESCE(timezone, 'Europe/Paris'), units = COALESCE(units, 'metric'), goal_note = COALESCE(goal_note, goal);

CREATE TABLE IF NOT EXISTS race_goals (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  race_date date NOT NULL,
  distance_m int NOT NULL,
  target_time_s int,
  priority text NOT NULL DEFAULT 'A',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS race_goals_user_date_idx ON race_goals (user_id, race_date);
COMMIT;
