-- Enable trigram extension for faster ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Workouts search indexes
CREATE INDEX IF NOT EXISTS workouts_comments_trgm_idx
  ON "public"."workouts"
  USING GIN ("comments" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS workouts_session_type_trgm_idx
  ON "public"."workouts"
  USING GIN ("sessionType" gin_trgm_ops);

-- Planned sessions search indexes
CREATE INDEX IF NOT EXISTS plan_sessions_comments_trgm_idx
  ON "public"."plan_sessions"
  USING GIN ("comments" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS plan_sessions_session_type_trgm_idx
  ON "public"."plan_sessions"
  USING GIN ("sessionType" gin_trgm_ops);
