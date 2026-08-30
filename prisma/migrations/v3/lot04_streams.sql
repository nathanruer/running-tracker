-- Lot 4 — streams : une ligne par séance (expand + migrate ; anciennes tables conservées jusqu'au contract)
BEGIN;
CREATE TABLE IF NOT EXISTS workout_streams_v3 (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workout_id text NOT NULL UNIQUE REFERENCES workouts(id) ON DELETE CASCADE,
  time jsonb, distance jsonb, velocity jsonb, altitude jsonb, heartrate jsonb, cadence jsonb,
  sample_count int,
  captured_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO workout_streams_v3 (workout_id, time, distance, velocity, altitude, heartrate, cadence, sample_count, captured_at)
SELECT s."workoutId",
  (array_agg(c.data->'data') FILTER (WHERE s."streamType" = 'time'))[1],
  (array_agg(c.data->'data') FILTER (WHERE s."streamType" = 'distance'))[1],
  (array_agg(c.data->'data') FILTER (WHERE s."streamType" = 'velocity_smooth'))[1],
  (array_agg(c.data->'data') FILTER (WHERE s."streamType" = 'altitude'))[1],
  (array_agg(c.data->'data') FILTER (WHERE s."streamType" = 'heartrate'))[1],
  (array_agg(c.data->'data') FILTER (WHERE s."streamType" = 'cadence'))[1],
  MAX(s."originalSize"),
  MIN(s."createdAt")
FROM workout_streams s
JOIN workout_stream_chunks c ON c."workoutStreamId" = s.id AND c."chunkIndex" = 0
GROUP BY s."workoutId"
ON CONFLICT (workout_id) DO NOTHING;
-- sample_count = longueur réelle des séries (Strava a pu sous-échantillonner : originalSize est une métadonnée amont)
UPDATE workout_streams_v3 SET sample_count = jsonb_array_length(COALESCE(time, distance, velocity, altitude, heartrate, cadence)) WHERE COALESCE(time, distance, velocity, altitude, heartrate, cadence) IS NOT NULL;
COMMIT;
