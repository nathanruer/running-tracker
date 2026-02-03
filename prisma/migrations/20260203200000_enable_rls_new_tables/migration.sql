-- Enable Row Level Security on new tables
ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."plan_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout_metrics_raw" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout_metrics_derived" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."external_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."external_payloads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout_streams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout_stream_chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."weather_observations" ENABLE ROW LEVEL SECURITY;

-- =====================
-- workouts (has userId)
-- =====================
CREATE POLICY "Users can view own workouts" ON "public"."workouts"
  FOR SELECT
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can insert own workouts" ON "public"."workouts"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can update own workouts" ON "public"."workouts"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can delete own workouts" ON "public"."workouts"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "userId");

-- ==========================
-- plan_sessions (has userId)
-- ==========================
CREATE POLICY "Users can view own plan_sessions" ON "public"."plan_sessions"
  FOR SELECT
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can insert own plan_sessions" ON "public"."plan_sessions"
  FOR INSERT
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can update own plan_sessions" ON "public"."plan_sessions"
  FOR UPDATE
  USING ((SELECT auth.uid())::text = "userId");

CREATE POLICY "Users can delete own plan_sessions" ON "public"."plan_sessions"
  FOR DELETE
  USING ((SELECT auth.uid())::text = "userId");

-- ==========================================
-- workout_metrics_raw (linked via workoutId)
-- ==========================================
CREATE POLICY "Users can view own workout_metrics_raw" ON "public"."workout_metrics_raw"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_metrics_raw"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own workout_metrics_raw" ON "public"."workout_metrics_raw"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_metrics_raw"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own workout_metrics_raw" ON "public"."workout_metrics_raw"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_metrics_raw"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own workout_metrics_raw" ON "public"."workout_metrics_raw"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_metrics_raw"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

-- ==============================================
-- workout_metrics_derived (linked via workoutId)
-- ==============================================
CREATE POLICY "Users can view own workout_metrics_derived" ON "public"."workout_metrics_derived"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_metrics_derived"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own workout_metrics_derived" ON "public"."workout_metrics_derived"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_metrics_derived"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own workout_metrics_derived" ON "public"."workout_metrics_derived"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_metrics_derived"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own workout_metrics_derived" ON "public"."workout_metrics_derived"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_metrics_derived"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

-- ==========================================
-- external_activities (linked via workoutId)
-- ==========================================
CREATE POLICY "Users can view own external_activities" ON "public"."external_activities"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "external_activities"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own external_activities" ON "public"."external_activities"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "external_activities"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own external_activities" ON "public"."external_activities"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "external_activities"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own external_activities" ON "public"."external_activities"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "external_activities"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

-- ======================================================
-- external_payloads (linked via externalActivityId -> workoutId)
-- ======================================================
CREATE POLICY "Users can view own external_payloads" ON "public"."external_payloads"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."external_activities"
      JOIN "public"."workouts" ON "workouts"."id" = "external_activities"."workoutId"
      WHERE "external_activities"."id" = "external_payloads"."externalActivityId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own external_payloads" ON "public"."external_payloads"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."external_activities"
      JOIN "public"."workouts" ON "workouts"."id" = "external_activities"."workoutId"
      WHERE "external_activities"."id" = "external_payloads"."externalActivityId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own external_payloads" ON "public"."external_payloads"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."external_activities"
      JOIN "public"."workouts" ON "workouts"."id" = "external_activities"."workoutId"
      WHERE "external_activities"."id" = "external_payloads"."externalActivityId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own external_payloads" ON "public"."external_payloads"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."external_activities"
      JOIN "public"."workouts" ON "workouts"."id" = "external_activities"."workoutId"
      WHERE "external_activities"."id" = "external_payloads"."externalActivityId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

-- ==========================================
-- workout_streams (linked via workoutId)
-- ==========================================
CREATE POLICY "Users can view own workout_streams" ON "public"."workout_streams"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_streams"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own workout_streams" ON "public"."workout_streams"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_streams"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own workout_streams" ON "public"."workout_streams"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_streams"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own workout_streams" ON "public"."workout_streams"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "workout_streams"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

-- ======================================================
-- workout_stream_chunks (linked via workoutStreamId -> workoutId)
-- ======================================================
CREATE POLICY "Users can view own workout_stream_chunks" ON "public"."workout_stream_chunks"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workout_streams"
      JOIN "public"."workouts" ON "workouts"."id" = "workout_streams"."workoutId"
      WHERE "workout_streams"."id" = "workout_stream_chunks"."workoutStreamId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own workout_stream_chunks" ON "public"."workout_stream_chunks"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."workout_streams"
      JOIN "public"."workouts" ON "workouts"."id" = "workout_streams"."workoutId"
      WHERE "workout_streams"."id" = "workout_stream_chunks"."workoutStreamId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own workout_stream_chunks" ON "public"."workout_stream_chunks"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workout_streams"
      JOIN "public"."workouts" ON "workouts"."id" = "workout_streams"."workoutId"
      WHERE "workout_streams"."id" = "workout_stream_chunks"."workoutStreamId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own workout_stream_chunks" ON "public"."workout_stream_chunks"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workout_streams"
      JOIN "public"."workouts" ON "workouts"."id" = "workout_streams"."workoutId"
      WHERE "workout_streams"."id" = "workout_stream_chunks"."workoutStreamId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

-- ==========================================
-- weather_observations (linked via workoutId)
-- ==========================================
CREATE POLICY "Users can view own weather_observations" ON "public"."weather_observations"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "weather_observations"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can insert own weather_observations" ON "public"."weather_observations"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "weather_observations"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can update own weather_observations" ON "public"."weather_observations"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "weather_observations"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Users can delete own weather_observations" ON "public"."weather_observations"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workouts"
      WHERE "workouts"."id" = "weather_observations"."workoutId"
      AND "workouts"."userId" = (SELECT auth.uid())::text
    )
  );
