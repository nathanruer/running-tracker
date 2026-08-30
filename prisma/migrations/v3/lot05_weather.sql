-- Lot 5 — météo : provider explicite (les suppressions payload/source attendent le contract)
BEGIN;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS provider text;
UPDATE weather_observations SET provider = 'open-meteo' WHERE provider IS NULL;
COMMIT;
