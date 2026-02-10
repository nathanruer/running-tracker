-- 1. Move pg_trgm from public to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Recreate GIN indexes using the new schema-qualified operator class
DROP INDEX IF EXISTS workouts_comments_trgm_idx;
DROP INDEX IF EXISTS workouts_session_type_trgm_idx;
DROP INDEX IF EXISTS plan_sessions_comments_trgm_idx;
DROP INDEX IF EXISTS plan_sessions_session_type_trgm_idx;

CREATE INDEX workouts_comments_trgm_idx
  ON "public"."workouts"
  USING GIN ("comments" extensions.gin_trgm_ops);

CREATE INDEX workouts_session_type_trgm_idx
  ON "public"."workouts"
  USING GIN ("sessionType" extensions.gin_trgm_ops);

CREATE INDEX plan_sessions_comments_trgm_idx
  ON "public"."plan_sessions"
  USING GIN ("comments" extensions.gin_trgm_ops);

CREATE INDEX plan_sessions_session_type_trgm_idx
  ON "public"."plan_sessions"
  USING GIN ("sessionType" extensions.gin_trgm_ops);

-- 2. Replace permissive _prisma_migrations policy with role-restricted one
DROP POLICY "Allow all operations on migrations table" ON "public"."_prisma_migrations";

CREATE POLICY "Allow postgres role full access to migrations" ON "public"."_prisma_migrations"
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);
