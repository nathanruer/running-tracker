-- Contrôles de parité V3 (expand phase : anciennes et nouvelles structures coexistent). Chaque ligne = un contrôle, attendu 0 sauf mention.
SELECT 'L1 civil day mismatch (expect 0)' AS check, COUNT(*) AS value FROM workouts WHERE (started_at AT TIME ZONE timezone)::date <> date::date
UNION ALL SELECT 'L1 precision=instant', COUNT(*) FROM workouts WHERE date_precision = 'instant'
UNION ALL SELECT 'L1 precision=day', COUNT(*) FROM workouts WHERE date_precision = 'day'
UNION ALL SELECT 'L2 users with Σdistance mismatch (expect 0)', COUNT(*) FROM (SELECT w."userId" FROM workouts w JOIN workout_metrics_raw m ON m."workoutId" = w.id GROUP BY w."userId" HAVING ABS(SUM(w.distance_m) - SUM(m."distanceMeters")) > COUNT(*)) x
UNION ALL SELECT 'L2 users with Σduration mismatch (expect 0)', COUNT(*) FROM (SELECT w."userId" FROM workouts w JOIN workout_metrics_raw m ON m."workoutId" = w.id GROUP BY w."userId" HAVING SUM(w.duration_s) <> SUM(m."durationSeconds")) x
UNION ALL SELECT 'L2 pace null (expect 0)', COUNT(*) FROM workouts WHERE pace_s_km IS NULL
UNION ALL SELECT 'L2 pace vs duration/distance off by >2s (info)', COUNT(*) FROM workouts WHERE distance_m > 0 AND ABS(pace_s_km - duration_s::numeric / (distance_m / 1000.0)) > 2
UNION ALL SELECT 'L2 max_hr filled from streams', COUNT(*) FROM workouts WHERE max_hr IS NOT NULL
UNION ALL SELECT 'L3 provider null (expect 0)', COUNT(*) FROM external_activities WHERE provider IS NULL
UNION ALL SELECT 'L3 raw_payload null (expect 0)', COUNT(*) FROM external_activities ea JOIN external_payloads p ON p."externalActivityId" = ea.id WHERE ea.raw_payload IS NULL
UNION ALL SELECT 'L3 polyline mismatch vs payload (expect 0)', COUNT(*) FROM workouts w JOIN external_activities ea ON ea."workoutId" = w.id WHERE COALESCE(w.route_polyline, '') <> COALESCE(ea.raw_payload->'map'->>'summary_polyline', '')
UNION ALL SELECT 'L3 has_route true', COUNT(*) FROM external_activities WHERE has_route
UNION ALL SELECT 'L3 streams_status done', COUNT(*) FROM external_activities WHERE streams_status = 'done'
UNION ALL SELECT 'L3 weather_status done', COUNT(*) FROM external_activities WHERE weather_status = 'done'
UNION ALL SELECT 'L4 workout_streams_v3 rows (expect 366)', COUNT(*) FROM workout_streams_v3
UNION ALL SELECT 'L4 sample_count vs time length mismatch (expect 0)', COUNT(*) FROM workout_streams_v3 WHERE time IS NOT NULL AND jsonb_array_length(time) <> sample_count
UNION ALL SELECT 'L4 per-type length mismatch vs source chunk (expect 0)', COUNT(*) FROM workout_streams s JOIN workout_stream_chunks c ON c."workoutStreamId" = s.id AND c."chunkIndex" = 0 JOIN workout_streams_v3 v ON v.workout_id = s."workoutId" WHERE jsonb_array_length(CASE s."streamType" WHEN 'time' THEN v.time WHEN 'distance' THEN v.distance WHEN 'velocity_smooth' THEN v.velocity WHEN 'altitude' THEN v.altitude WHEN 'heartrate' THEN v.heartrate WHEN 'cadence' THEN v.cadence END) <> jsonb_array_length(c.data->'data')
UNION ALL SELECT 'L4 workouts downsampled upstream by Strava (info)', COUNT(DISTINCT s."workoutId") FROM workout_streams s JOIN workout_stream_chunks c ON c."workoutStreamId" = s.id AND c."chunkIndex" = 0 WHERE jsonb_array_length(c.data->'data') <> s."originalSize"
UNION ALL SELECT 'L5 weather payload vs columns mismatch (expect 0)', COUNT(*) FROM weather_observations WHERE payload IS NOT NULL AND (ABS((payload->>'temperature')::float - temperature) > 0.01 OR ABS((payload->>'humidity')::float - humidity) > 0.01 OR ABS((payload->>'windSpeed')::float - "windSpeed") > 0.01)
UNION ALL SELECT 'L5 provider null (expect 0)', COUNT(*) FROM weather_observations WHERE provider IS NULL
UNION ALL SELECT 'L6 planned_workouts rows (expect 28)', COUNT(*) FROM planned_workouts
UNION ALL SELECT 'L6 linked to a workout (expect 27)', COUNT(*) FROM planned_workouts WHERE workout_id IS NOT NULL
UNION ALL SELECT 'L6 origin coach (expect 20)', COUNT(*) FROM planned_workouts WHERE origin = 'coach'
UNION ALL SELECT 'L6 family null (info)', COUNT(*) FROM planned_workouts WHERE family IS NULL
UNION ALL SELECT 'L7 profiles timezone/units null (expect 0)', COUNT(*) FROM user_profiles WHERE timezone IS NULL OR units IS NULL
UNION ALL SELECT 'L7 goal_note copied', COUNT(*) FROM user_profiles WHERE goal_note IS NOT NULL
UNION ALL SELECT 'L9 messages kind null (expect 0)', COUNT(*) FROM conversation_messages WHERE kind IS NULL
UNION ALL SELECT 'L9 recommendation payloads copied (expect 9-ish)', COUNT(*) FROM conversation_messages WHERE kind = 'recommendation' AND payload IS NOT NULL
UNION ALL SELECT 'L9 conversations with summary', COUNT(*) FROM conversations WHERE summary IS NOT NULL
UNION ALL SELECT 'L13 family manual', COUNT(*) FROM workouts WHERE family_source = 'manual'
UNION ALL SELECT 'L13 family from plan', COUNT(*) FROM workouts WHERE family_source = 'plan'
UNION ALL SELECT 'L13 family null (auto job later)', COUNT(*) FROM workouts WHERE family IS NULL
UNION ALL SELECT 'FK orphans workouts→users (expect 0)', COUNT(*) FROM workouts w LEFT JOIN users u ON u.id = w."userId" WHERE u.id IS NULL
UNION ALL SELECT 'FK orphans planned→users (expect 0)', COUNT(*) FROM planned_workouts p LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL;
