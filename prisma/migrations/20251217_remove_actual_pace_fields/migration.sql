-- Migration to remove actual pace fields from interval_details JSON
-- This migration removes the fields: actualEffortPace, actualEffortHR, actualRecoveryPace

BEGIN;

-- Create a temporary table to store the cleaned interval_details
CREATE TABLE IF NOT EXISTS temp_session_updates (
  id TEXT PRIMARY KEY,
  cleaned_interval_details JSONB
);

-- Update all sessions with interval_details to remove the actual pace fields
INSERT INTO temp_session_updates (id, cleaned_interval_details)
SELECT 
  id,
  CASE
    WHEN interval_details IS NOT NULL THEN
      jsonb_set(
        jsonb_set(
          jsonb_set(
            interval_details::jsonb,
            '{actualEffortPace}',
            'null'
          ),
          '{actualEffortHR}',
          'null'
        ),
        '{actualRecoveryPace}',
        'null'
      )
    ELSE NULL
  END
FROM training_sessions
WHERE interval_details IS NOT NULL;

-- Update the training_sessions table with the cleaned data
UPDATE training_sessions ts
SET interval_details = tsu.cleaned_interval_details
FROM temp_session_updates tsu
WHERE ts.id = tsu.id;

-- Drop the temporary table
DROP TABLE temp_session_updates;

COMMIT;