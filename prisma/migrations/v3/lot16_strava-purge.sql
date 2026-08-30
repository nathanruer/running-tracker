-- Lot 16 (suite) — plus aucune référence Strava dans le schéma : enum source_provider réduit à intervals_icu,
-- connected_accounts.provider typé par cet enum. À exécuter après lot16_strava-purge.ts --apply.
BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM workout_sources WHERE provider = 'strava')
     OR EXISTS (SELECT 1 FROM connected_accounts WHERE provider = 'strava')
     OR EXISTS (SELECT 1 FROM dismissed_source_activities WHERE provider = 'strava') THEN
    RAISE EXCEPTION 'strava rows remain';
  END IF;
END $$;

ALTER TYPE source_provider RENAME TO source_provider_old;
CREATE TYPE source_provider AS ENUM ('intervals_icu');
ALTER TABLE workout_sources ALTER COLUMN provider TYPE source_provider USING provider::text::source_provider;
ALTER TABLE dismissed_source_activities ALTER COLUMN provider TYPE source_provider USING provider::text::source_provider;
ALTER TABLE connected_accounts ALTER COLUMN provider TYPE source_provider USING provider::text::source_provider;
DROP TYPE source_provider_old;

COMMIT;
