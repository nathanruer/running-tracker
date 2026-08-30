-- Lot 3 — sources externes unifiées, statuts d'enrichissement, polyline en colonne (expand + migrate)
BEGIN;
DO $$ BEGIN CREATE TYPE source_provider AS ENUM ('strava', 'intervals_icu'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enrichment_status AS ENUM ('pending', 'running', 'done', 'failed', 'not_applicable'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE external_activities
  ADD COLUMN IF NOT EXISTS provider source_provider,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS payload_kind text,
  ADD COLUMN IF NOT EXISTS has_route boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_streams boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS streams_status enrichment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS weather_status enrichment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS route_status enrichment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS intervals_status enrichment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS route_polyline text;

UPDATE external_activities ea
SET provider = ea.source::source_provider,
    raw_payload = p.payload,
    payload_kind = CASE WHEN p.payload ? 'start_latlng' THEN 'detail' ELSE 'summary' END,
    synced_at = ea."updatedAt"
FROM external_payloads p WHERE p."externalActivityId" = ea.id;
UPDATE external_activities SET provider = source::source_provider WHERE provider IS NULL;

UPDATE workouts w SET route_polyline = ea.raw_payload->'map'->>'summary_polyline'
FROM external_activities ea
WHERE ea."workoutId" = w.id AND ea.raw_payload->'map'->>'summary_polyline' IS NOT NULL AND w.route_polyline IS NULL;

UPDATE external_activities ea
SET has_route = (w.route_polyline IS NOT NULL),
    has_streams = EXISTS (SELECT 1 FROM workout_streams s WHERE s."workoutId" = w.id)
FROM workouts w WHERE w.id = ea."workoutId";

UPDATE external_activities ea
SET streams_status = CASE WHEN ea."sourceStatus" = 'no_streams' THEN 'not_applicable'::enrichment_status
                          WHEN ea.has_streams THEN 'done' ELSE 'pending' END,
    weather_status = CASE WHEN EXISTS (SELECT 1 FROM weather_observations wo WHERE wo."workoutId" = ea."workoutId") THEN 'done'::enrichment_status
                          WHEN ea.has_route THEN 'pending' ELSE 'not_applicable' END,
    route_status = CASE WHEN ea.has_route THEN 'done'::enrichment_status ELSE 'pending' END,
    intervals_status = 'pending';
CREATE INDEX IF NOT EXISTS external_activities_user_provider_idx ON external_activities ("userId", provider);
COMMIT;
