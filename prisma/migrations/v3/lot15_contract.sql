-- Lot 15 — contract des lots 1-10 + lot 11 (nettoyage final). À exécuter après le lot 14. Une transaction.
BEGIN;

-- Pré-contrôles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM workouts WHERE started_at IS NULL) THEN RAISE EXCEPTION 'workouts.started_at NULL'; END IF;
  IF EXISTS (SELECT 1 FROM external_activities WHERE provider IS NULL) THEN RAISE EXCEPTION 'external_activities.provider NULL'; END IF;
  IF EXISTS (SELECT 1 FROM weather_observations WHERE (payload->>'temperature')::float IS DISTINCT FROM temperature OR "observedAt" IS NULL) THEN RAISE EXCEPTION 'weather parity'; END IF;
  IF EXISTS (SELECT 1 FROM planned_workouts p JOIN workouts w ON w."planSessionId" = p.id WHERE p.workout_id IS DISTINCT FROM w.id) THEN RAISE EXCEPTION 'planned_workouts link mismatch'; END IF;
END $$;

-- 1. workouts : colonnes legacy, renommages snake_case, zéros → NULL
ALTER TABLE workouts DROP CONSTRAINT "workouts_planSessionId_fkey";
ALTER TABLE workouts
  DROP COLUMN "planSessionId",
  DROP COLUMN date,
  DROP COLUMN week,
  DROP COLUMN "sessionType",
  DROP COLUMN status;
ALTER TABLE workouts RENAME COLUMN "userId" TO user_id;
ALTER TABLE workouts RENAME COLUMN "sessionNumber" TO session_number;
ALTER TABLE workouts RENAME COLUMN "perceivedExertion" TO rpe;
ALTER TABLE workouts RENAME COLUMN comments TO notes;
ALTER TABLE workouts RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE workouts RENAME COLUMN "updatedAt" TO updated_at;
ALTER INDEX "workouts_userId_idx" RENAME TO workouts_user_id_idx;
ALTER TABLE workouts RENAME CONSTRAINT "workouts_userId_fkey" TO workouts_user_id_fkey;
UPDATE workouts SET pace_s_km = NULL WHERE pace_s_km = 0;
UPDATE workouts SET distance_m = NULL WHERE distance_m = 0;
UPDATE workouts SET avg_hr = NULL WHERE avg_hr = 0;

-- 2. Tables fusionnées
DROP TABLE workout_metrics_raw, workout_metrics_derived, workout_stream_chunks, workout_streams, external_payloads;

-- 3. external_activities → workout_sources
ALTER TABLE external_activities RENAME TO workout_sources;
ALTER TABLE workout_sources DROP COLUMN source, DROP COLUMN "sourceStatus";
ALTER TABLE workout_sources RENAME COLUMN "workoutId" TO workout_id;
ALTER TABLE workout_sources RENAME COLUMN "userId" TO user_id;
ALTER TABLE workout_sources RENAME COLUMN "externalId" TO external_id;
ALTER TABLE workout_sources RENAME COLUMN "startedAt" TO started_at;
ALTER TABLE workout_sources RENAME COLUMN "elapsedSeconds" TO elapsed_s;
ALTER TABLE workout_sources RENAME COLUMN "movingSeconds" TO moving_s;
ALTER TABLE workout_sources RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE workout_sources RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE workout_sources ALTER COLUMN provider SET NOT NULL;
ALTER TABLE workout_sources ADD CONSTRAINT workout_sources_user_id_provider_external_id_key UNIQUE (user_id, provider, external_id);
ALTER INDEX external_activities_pkey RENAME TO workout_sources_pkey;
ALTER INDEX external_activities_user_provider_idx RENAME TO workout_sources_user_id_provider_idx;
ALTER INDEX "external_activities_workoutId_idx" RENAME TO workout_sources_workout_id_idx;
ALTER TABLE workout_sources RENAME CONSTRAINT "external_activities_userId_fkey" TO workout_sources_user_id_fkey;
ALTER TABLE workout_sources RENAME CONSTRAINT "external_activities_workoutId_fkey" TO workout_sources_workout_id_fkey;

-- 4. Streams v3 → workout_streams
ALTER TABLE workout_streams_v3 RENAME TO workout_streams;
ALTER INDEX workout_streams_v3_pkey RENAME TO workout_streams_pkey;
ALTER INDEX workout_streams_v3_workout_id_key RENAME TO workout_streams_workout_id_key;
ALTER TABLE workout_streams RENAME CONSTRAINT workout_streams_v3_workout_id_fkey TO workout_streams_workout_id_fkey;

-- 5. Météo : colonnes typées uniquement
ALTER TABLE weather_observations DROP COLUMN payload, DROP COLUMN source;
ALTER TABLE weather_observations RENAME COLUMN "workoutId" TO workout_id;
ALTER TABLE weather_observations RENAME COLUMN "observedAt" TO observed_at;
ALTER TABLE weather_observations RENAME COLUMN temperature TO temperature_c;
ALTER TABLE weather_observations RENAME COLUMN "apparentTemperature" TO apparent_temperature_c;
ALTER TABLE weather_observations RENAME COLUMN humidity TO humidity_pct;
ALTER TABLE weather_observations RENAME COLUMN "windSpeed" TO wind_speed_kmh;
ALTER TABLE weather_observations RENAME COLUMN precipitation TO precipitation_mm;
ALTER TABLE weather_observations RENAME COLUMN "conditionCode" TO condition_code;
ALTER TABLE weather_observations RENAME COLUMN "createdAt" TO created_at;
UPDATE weather_observations SET provider = 'open-meteo' WHERE provider IS NULL;
ALTER TABLE weather_observations ALTER COLUMN provider SET NOT NULL, ALTER COLUMN provider SET DEFAULT 'open-meteo', ALTER COLUMN observed_at SET NOT NULL;
ALTER INDEX "weather_observations_workoutId_key" RENAME TO weather_observations_workout_id_key;
ALTER TABLE weather_observations RENAME CONSTRAINT "weather_observations_workoutId_fkey" TO weather_observations_workout_id_fkey;

-- 6. Profil athlète
ALTER TABLE user_profiles RENAME TO athlete_profiles;
UPDATE athlete_profiles SET goal_note = COALESCE(goal_note, goal), timezone = COALESCE(timezone, 'Europe/Paris'), units = COALESCE(units, 'metric');
ALTER TABLE athlete_profiles DROP COLUMN goal;
ALTER TABLE athlete_profiles RENAME COLUMN "userId" TO user_id;
ALTER TABLE athlete_profiles RENAME COLUMN "maxHeartRate" TO max_hr;
ALTER TABLE athlete_profiles RENAME COLUMN weight TO weight_kg;
ALTER TABLE athlete_profiles RENAME COLUMN vma TO declared_vma_kmh;
ALTER TABLE athlete_profiles RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE athlete_profiles RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE athlete_profiles ALTER COLUMN timezone SET NOT NULL, ALTER COLUMN timezone SET DEFAULT 'Europe/Paris', ALTER COLUMN units SET NOT NULL, ALTER COLUMN units SET DEFAULT 'metric';
DROP INDEX "user_profiles_userId_idx";
ALTER INDEX user_profiles_pkey RENAME TO athlete_profiles_pkey;
ALTER INDEX "user_profiles_userId_key" RENAME TO athlete_profiles_user_id_key;
ALTER TABLE athlete_profiles RENAME CONSTRAINT "user_profiles_userId_fkey" TO athlete_profiles_user_id_fkey;
DROP TABLE user_preferences;

-- 7. Comptes connectés
ALTER TABLE external_accounts RENAME TO connected_accounts;
ALTER TABLE connected_accounts DROP COLUMN scopes;
ALTER TABLE connected_accounts RENAME COLUMN "userId" TO user_id;
ALTER TABLE connected_accounts RENAME COLUMN "externalId" TO external_id;
ALTER TABLE connected_accounts RENAME COLUMN "accessToken" TO access_token;
ALTER TABLE connected_accounts RENAME COLUMN "refreshToken" TO refresh_token;
ALTER TABLE connected_accounts RENAME COLUMN "tokenExpiresAt" TO token_expires_at;
ALTER TABLE connected_accounts RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE connected_accounts RENAME COLUMN "updatedAt" TO updated_at;
ALTER INDEX external_accounts_pkey RENAME TO connected_accounts_pkey;
ALTER INDEX "external_accounts_provider_externalId_key" RENAME TO connected_accounts_provider_external_id_key;
ALTER INDEX "external_accounts_userId_idx" RENAME TO connected_accounts_user_id_idx;
ALTER INDEX "external_accounts_userId_provider_key" RENAME TO connected_accounts_user_id_provider_key;
ALTER TABLE connected_accounts RENAME CONSTRAINT "external_accounts_userId_fkey" TO connected_accounts_user_id_fkey;

-- 8. Conversations
ALTER TABLE conversations RENAME COLUMN "userId" TO user_id;
ALTER TABLE conversations RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE conversations RENAME COLUMN "updatedAt" TO updated_at;
ALTER INDEX "conversations_userId_idx" RENAME TO conversations_user_id_idx;
ALTER INDEX "conversations_updatedAt_idx" RENAME TO conversations_updated_at_idx;
ALTER INDEX "conversations_userId_updatedAt_idx" RENAME TO conversations_user_id_updated_at_idx;
ALTER TABLE conversations RENAME CONSTRAINT "conversations_userId_fkey" TO conversations_user_id_fkey;
DELETE FROM conversation_messages WHERE role = 'system' AND kind = 'summary';
ALTER TABLE conversation_messages RENAME COLUMN "conversationId" TO conversation_id;
ALTER TABLE conversation_messages RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE conversation_messages ALTER COLUMN kind SET DEFAULT 'text';
ALTER INDEX "conversation_messages_conversationId_idx" RENAME TO conversation_messages_conversation_id_idx;
ALTER INDEX "conversation_messages_conversationId_createdAt_idx" RENAME TO conversation_messages_conversation_id_created_at_idx;
ALTER TABLE conversation_messages RENAME CONSTRAINT "conversation_messages_conversationId_fkey" TO conversation_messages_conversation_id_fkey;
DROP TABLE conversation_message_payloads;

-- 9. Planifiées : fin du pont v1
ALTER TABLE planned_workouts DROP COLUMN legacy_plan_session_id, DROP COLUMN structure_legacy;
DROP TABLE plan_sessions;

-- 10. FK des tables V3 alignées sur la convention Prisma (ON UPDATE CASCADE)
ALTER TABLE athlete_states DROP CONSTRAINT athlete_states_user_id_fkey, ADD CONSTRAINT athlete_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE dismissed_source_activities DROP CONSTRAINT dismissed_source_activities_user_id_fkey, ADD CONSTRAINT dismissed_source_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE planned_workouts DROP CONSTRAINT planned_workouts_user_id_fkey, ADD CONSTRAINT planned_workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE planned_workouts DROP CONSTRAINT planned_workouts_workout_id_fkey, ADD CONSTRAINT planned_workouts_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE race_goals DROP CONSTRAINT race_goals_user_id_fkey, ADD CONSTRAINT race_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE training_plans DROP CONSTRAINT training_plans_user_id_fkey, ADD CONSTRAINT training_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE training_plans DROP CONSTRAINT training_plans_race_goal_id_fkey, ADD CONSTRAINT training_plans_race_goal_id_fkey FOREIGN KEY (race_goal_id) REFERENCES race_goals(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE training_weeks DROP CONSTRAINT training_weeks_user_id_fkey, ADD CONSTRAINT training_weeks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE training_weeks DROP CONSTRAINT training_weeks_plan_id_fkey, ADD CONSTRAINT training_weeks_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE workout_intervals DROP CONSTRAINT workout_intervals_workout_id_fkey, ADD CONSTRAINT workout_intervals_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE workout_streams DROP CONSTRAINT workout_streams_workout_id_fkey, ADD CONSTRAINT workout_streams_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
