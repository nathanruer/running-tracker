-- Lot 10 — périodisation et activités écartées (additif)
BEGIN;
CREATE TABLE IF NOT EXISTS training_plans (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  race_goal_id text REFERENCES race_goals(id) ON DELETE SET NULL,
  phases jsonb NOT NULL,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS training_plans_user_idx ON training_plans (user_id, status);

CREATE TABLE IF NOT EXISTS training_weeks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id text REFERENCES training_plans(id) ON DELETE SET NULL,
  week_start date NOT NULL,
  phase text NOT NULL,
  budget jsonb NOT NULL,
  slots jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE TABLE IF NOT EXISTS dismissed_source_activities (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider source_provider NOT NULL,
  external_id text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, external_id)
);
COMMIT;
