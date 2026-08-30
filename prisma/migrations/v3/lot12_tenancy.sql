-- Lot 12 — tenancy effective : rôle applicatif sans BYPASSRLS, policies d'isolation par user_id,
-- contexte `app.user_id` posé par l'application dans chaque transaction (set_config … is_local = true).
-- Usage (rôle propriétaire) : psql -v ON_ERROR_STOP=1 -v app_password='…' "$ADMIN_URL" -f prisma/migrations/v3/lot12_tenancy.sql
BEGIN;

-- 1. Rôle applicatif
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;
  END IF;
END $$;
ALTER ROLE app_user WITH LOGIN NOBYPASSRLS PASSWORD :'app_password';

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
REVOKE ALL ON TABLE _prisma_migrations FROM app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- 2. Identité courante : NULL tant que l'application n'a rien posé → aucune ligne visible (fermé par défaut)
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;

-- 3. Anciennes policies (auth.uid() de Supabase) : jamais actives pour l'application, retirées
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- 4. Isolation par table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users FOR ALL TO app_user
  USING (id = app_current_user_id()) WITH CHECK (id = app_current_user_id());

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['athlete_profiles', 'connected_accounts', 'workouts', 'workout_sources', 'planned_workouts',
                            'conversations', 'race_goals', 'athlete_states', 'training_plans', 'training_weeks',
                            'dismissed_source_activities'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR ALL TO app_user USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id())', t);
  END LOOP;
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['workout_streams', 'workout_intervals', 'weather_observations'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %1$I FOR ALL TO app_user
         USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = %1$I.workout_id AND w.user_id = app_current_user_id()))
         WITH CHECK (EXISTS (SELECT 1 FROM workouts w WHERE w.id = %1$I.workout_id AND w.user_id = app_current_user_id()))', t);
  END LOOP;
END $$;

ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversation_messages FOR ALL TO app_user
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_messages.conversation_id AND c.user_id = app_current_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_messages.conversation_id AND c.user_id = app_current_user_id()));

COMMIT;
