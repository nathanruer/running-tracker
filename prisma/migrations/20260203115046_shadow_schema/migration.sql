-- CreateTable
CREATE TABLE "plan_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legacySessionId" TEXT,
    "sessionNumber" INTEGER,
    "week" INTEGER,
    "plannedDate" TIMESTAMP(3),
    "sessionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "targetDuration" INTEGER,
    "targetDistance" DOUBLE PRECISION,
    "targetPace" TEXT,
    "targetHeartRateBpm" TEXT,
    "targetRPE" INTEGER,
    "intervalDetails" JSONB,
    "recommendationId" TEXT,
    "comments" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legacySessionId" TEXT,
    "planSessionId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "sessionNumber" INTEGER,
    "week" INTEGER,
    "sessionType" TEXT,
    "comments" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_metrics_raw" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "distanceMeters" DOUBLE PRECISION,
    "avgPace" TEXT,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "averageCadence" DOUBLE PRECISION,
    "elevationGain" DOUBLE PRECISION,
    "calories" INTEGER,

    CONSTRAINT "workout_metrics_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_metrics_derived" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "pace" TEXT,
    "zones" JSONB,
    "efficiency" DOUBLE PRECISION,
    "trainingLoad" DOUBLE PRECISION,

    CONSTRAINT "workout_metrics_derived_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_activities" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceStatus" TEXT DEFAULT 'imported',
    "startedAt" TIMESTAMP(3),
    "elapsedSeconds" INTEGER,
    "movingSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_payloads" (
    "id" TEXT NOT NULL,
    "externalActivityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadType" TEXT,
    "payloadVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_payloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_streams" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "streamType" TEXT NOT NULL,
    "resolution" TEXT,
    "seriesType" TEXT,
    "originalSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_stream_chunks" (
    "id" TEXT NOT NULL,
    "workoutStreamId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_stream_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_observations" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3),
    "temperature" DOUBLE PRECISION,
    "apparentTemperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "precipitation" DOUBLE PRECISION,
    "conditionCode" INTEGER,
    "source" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_sessions_userId_idx" ON "plan_sessions"("userId");

-- CreateIndex
CREATE INDEX "plan_sessions_userId_plannedDate_idx" ON "plan_sessions"("userId", "plannedDate");

-- CreateIndex
CREATE INDEX "plan_sessions_status_idx" ON "plan_sessions"("status");

-- CreateIndex
CREATE INDEX "plan_sessions_legacySessionId_idx" ON "plan_sessions"("legacySessionId");

-- CreateIndex
CREATE UNIQUE INDEX "workouts_planSessionId_key" ON "workouts"("planSessionId");

-- CreateIndex
CREATE INDEX "workouts_userId_idx" ON "workouts"("userId");

-- CreateIndex
CREATE INDEX "workouts_userId_date_idx" ON "workouts"("userId", "date");

-- CreateIndex
CREATE INDEX "workouts_status_idx" ON "workouts"("status");

-- CreateIndex
CREATE INDEX "workouts_legacySessionId_idx" ON "workouts"("legacySessionId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_metrics_raw_workoutId_key" ON "workout_metrics_raw"("workoutId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_metrics_derived_workoutId_key" ON "workout_metrics_derived"("workoutId");

-- CreateIndex
CREATE INDEX "external_activities_workoutId_idx" ON "external_activities"("workoutId");

-- CreateIndex
CREATE INDEX "external_activities_source_externalId_idx" ON "external_activities"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "external_payloads_externalActivityId_key" ON "external_payloads"("externalActivityId");

-- CreateIndex
CREATE INDEX "workout_streams_workoutId_idx" ON "workout_streams"("workoutId");

-- CreateIndex
CREATE INDEX "workout_streams_workoutId_streamType_idx" ON "workout_streams"("workoutId", "streamType");

-- CreateIndex
CREATE INDEX "workout_stream_chunks_workoutStreamId_chunkIndex_idx" ON "workout_stream_chunks"("workoutStreamId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "weather_observations_workoutId_key" ON "weather_observations"("workoutId");

-- AddForeignKey
ALTER TABLE "plan_sessions" ADD CONSTRAINT "plan_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_planSessionId_fkey" FOREIGN KEY ("planSessionId") REFERENCES "plan_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_metrics_raw" ADD CONSTRAINT "workout_metrics_raw_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_metrics_derived" ADD CONSTRAINT "workout_metrics_derived_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_activities" ADD CONSTRAINT "external_activities_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_payloads" ADD CONSTRAINT "external_payloads_externalActivityId_fkey" FOREIGN KEY ("externalActivityId") REFERENCES "external_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_streams" ADD CONSTRAINT "workout_streams_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_stream_chunks" ADD CONSTRAINT "workout_stream_chunks_workoutStreamId_fkey" FOREIGN KEY ("workoutStreamId") REFERENCES "workout_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_observations" ADD CONSTRAINT "weather_observations_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
