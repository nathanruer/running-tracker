-- Lot 2 — métriques numériques fusionnées dans workouts (expand + migrate)
BEGIN;
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS duration_s int,
  ADD COLUMN IF NOT EXISTS distance_m int,
  ADD COLUMN IF NOT EXISTS pace_s_km int,
  ADD COLUMN IF NOT EXISTS avg_hr int,
  ADD COLUMN IF NOT EXISTS max_hr int,
  ADD COLUMN IF NOT EXISTS avg_cadence real,
  ADD COLUMN IF NOT EXISTS elevation_gain_m real,
  ADD COLUMN IF NOT EXISTS calories int;

UPDATE workouts w
SET duration_s = m."durationSeconds",
    distance_m = ROUND(m."distanceMeters")::int,
    avg_hr = m."avgHeartRate",
    max_hr = m."maxHeartRate",
    avg_cadence = m."averageCadence",
    elevation_gain_m = m."elevationGain",
    calories = m.calories,
    pace_s_km = CASE WHEN m."avgPace" ~ '^\d{1,2}:\d{2}$'
                     THEN split_part(m."avgPace", ':', 1)::int * 60 + split_part(m."avgPace", ':', 2)::int END
FROM workout_metrics_raw m
WHERE m."workoutId" = w.id;

UPDATE workouts w SET max_hr = sub.mx
FROM (
  SELECT s."workoutId", MAX((e.value)::text::numeric)::int AS mx
  FROM workout_streams s
  JOIN workout_stream_chunks c ON c."workoutStreamId" = s.id AND c."chunkIndex" = 0,
  LATERAL jsonb_array_elements(c.data->'data') e
  WHERE s."streamType" = 'heartrate' AND jsonb_typeof(e.value) = 'number'
  GROUP BY s."workoutId"
) sub
WHERE sub."workoutId" = w.id AND w.max_hr IS NULL;
COMMIT;
