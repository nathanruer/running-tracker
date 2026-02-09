import 'server-only';
/**
 * Session Mapper - Unified transformation from database entities to TrainingSession.
 * 
 * This module consolidates the mapping logic that was previously duplicated
 * between mapWorkoutToTrainingSession and mapWorkoutToTrainingSessionTable.
 */

import { Prisma } from '@prisma/client';
import type { TrainingSession } from '@/lib/types';
import { formatDuration } from '@/lib/utils/duration/format';

// ============================================================================
// Types for mapper inputs (database entity shapes)
// ============================================================================

export interface WorkoutMetricsRaw {
  durationSeconds: number | null;
  distanceMeters: number | null;
  avgPace: string | null;
  avgHeartRate: number | null;
  averageCadence: number | null;
  elevationGain: number | null;
  calories: number | null;
}

export interface PlanSessionData {
  plannedDate: Date | null;
  sessionType: string | null;
  targetDuration: number | null;
  targetDistance: number | null;
  targetPace: string | null;
  targetHeartRateBpm: string | null;
  targetRPE: number | null;
  intervalDetails: Prisma.JsonValue | null;
  recommendationId: string | null;
  comments: string;
}

export interface ExternalActivityData {
  source: string;
  externalId: string;
  external_payloads: { payload: Prisma.JsonValue | null } | null;
}

export interface WeatherObservationData {
  observedAt: Date | null;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  conditionCode: number | null;
  payload: Prisma.JsonValue | null;
}

export interface WorkoutStreamData {
  streamType: string;
  workout_stream_chunks: { data: Prisma.JsonValue }[];
}

export interface WorkoutBase {
  id: string;
  userId: string;
  planSessionId: string | null;
  date: Date;
  status: string;
  sessionNumber: number | null;
  week: number | null;
  sessionType: string | null;
  comments: string;
  perceivedExertion: number | null;
  plan_sessions: PlanSessionData | null;
  workout_metrics_raw: WorkoutMetricsRaw | null;
  weather_observations?: WeatherObservationData | null;
}

export interface WorkoutFull extends WorkoutBase {
  external_activities: ExternalActivityData[];
  weather_observations: WeatherObservationData | null;
  workout_streams: WorkoutStreamData[];
}

export interface PlanSessionFull {
  id: string;
  userId: string;
  sessionNumber: number | null;
  week: number | null;
  plannedDate: Date | null;
  sessionType: string | null;
  status: string;
  targetDuration: number | null;
  targetDistance: number | null;
  targetPace: string | null;
  targetHeartRateBpm: string | null;
  targetRPE: number | null;
  intervalDetails: Prisma.JsonValue | null;
  recommendationId: string | null;
  comments: string;
}

// ============================================================================
// Mapper options
// ============================================================================

export interface SessionMapperOptions {
  /**
   * If true, includes external activities, weather, and streams data.
   * If false, only includes core workout and metrics data (for table view).
   * @default true
   */
  includeFullData?: boolean;
  
  /**
   * If true, includes weather data even when includeFullData is false.
   * @default false
   */
  includeWeather?: boolean;

  /**
   * If true, uses plannedDate as the date field for plan sessions.
   * @default false
   */
  includePlannedDateAsDate?: boolean;
}

const DEFAULT_OPTIONS: SessionMapperOptions = {
  includeFullData: true,
  includeWeather: false,
  includePlannedDateAsDate: false,
};

// ============================================================================
// Helper functions
// ============================================================================

function formatDurationFromSeconds(durationSeconds: number | null | undefined): string | null {
  if (durationSeconds == null) return null;
  return formatDuration(durationSeconds);
}

function selectExternalActivity(activities: ExternalActivityData[]): ExternalActivityData | null {
  if (!activities.length) return null;
  const strava = activities.find((activity) => activity.source === 'strava');
  return strava ?? activities[0];
}

function mapStreams(streams: WorkoutStreamData[]): Record<string, Prisma.JsonValue> | null {
  if (!streams.length) return null;

  const result: Record<string, Prisma.JsonValue> = {};
  for (const stream of streams) {
    const chunk = stream.workout_stream_chunks[0];
    if (chunk) {
      result[stream.streamType] = chunk.data;
    }
  }

  return Object.keys(result).length ? result : null;
}

function mapWeather(weather: WeatherObservationData | null): TrainingSession['weather'] {
  if (!weather) return null;

  const payload = weather.payload as Record<string, unknown> | null;

  // Required fields must have a number value (use fallback for payload extraction)
  const conditionCode = weather.conditionCode ?? (typeof payload?.conditionCode === 'number' ? payload.conditionCode : 0);
  const temperature = weather.temperature ?? (typeof payload?.temperature === 'number' ? payload.temperature : 0);
  const windSpeed = weather.windSpeed ?? (typeof payload?.windSpeed === 'number' ? payload.windSpeed : 0);
  const precipitation = weather.precipitation ?? (typeof payload?.precipitation === 'number' ? payload.precipitation : 0);

  return {
    conditionCode,
    temperature,
    apparentTemperature: weather.apparentTemperature ?? (typeof payload?.apparentTemperature === 'number' ? payload.apparentTemperature : undefined),
    humidity: weather.humidity ?? (typeof payload?.humidity === 'number' ? payload.humidity : undefined),
    windSpeed,
    precipitation,
    timestamp: weather.observedAt ? weather.observedAt.getTime() : undefined,
  };
}

// ============================================================================
// Core base session data (shared between full and table views)
// ============================================================================

function buildBaseSession(workout: WorkoutBase): Omit<
  TrainingSession,
  'externalId' | 'source' | 'stravaData' | 'stravaStreams' | 'averageTemp' | 'weather'
> {
  const metrics = workout.workout_metrics_raw;
  const plan = workout.plan_sessions;

  return {
    id: workout.id,
    userId: workout.userId,
    sessionNumber: workout.sessionNumber ?? 0,
    week: workout.week ?? null,
    date: workout.date.toISOString(),
    sessionType: workout.sessionType || plan?.sessionType || null,
    duration: formatDurationFromSeconds(metrics?.durationSeconds ?? null),
    distance: metrics?.distanceMeters != null ? metrics.distanceMeters / 1000 : null,
    avgPace: metrics?.avgPace ?? null,
    avgHeartRate: metrics?.avgHeartRate ?? null,
    intervalDetails: plan?.intervalDetails as TrainingSession['intervalDetails'] | null,
    perceivedExertion: workout.perceivedExertion ?? null,
    comments: workout.comments ?? plan?.comments ?? '',
    status: workout.status,
    plannedDate: plan?.plannedDate ? plan.plannedDate.toISOString() : null,
    targetPace: plan?.targetPace ?? null,
    targetDuration: plan?.targetDuration ?? null,
    targetDistance: plan?.targetDistance ?? null,
    targetHeartRateBpm: plan?.targetHeartRateBpm ?? null,
    targetRPE: plan?.targetRPE ?? null,
    recommendationId: plan?.recommendationId ?? null,
    elevationGain: metrics?.elevationGain ?? null,
    averageCadence: metrics?.averageCadence ?? null,
    calories: metrics?.calories ?? null,
  };
}

// ============================================================================
// Public mapper functions
// ============================================================================

/**
 * Maps a workout entity to a TrainingSession.
 * 
 * @param workout - Database workout entity with relations
 * @param options - Mapping options
 * @returns TrainingSession object
 * 
 * @example
 * // Full view (default)
 * const session = mapWorkoutToSession(workout);
 * 
 * // Table view (minimal data)
 * const session = mapWorkoutToSession(workout, { includeFullData: false });
 */
export function mapWorkoutToSession(
  workout: WorkoutBase | WorkoutFull,
  options: SessionMapperOptions = {}
): TrainingSession {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const base = buildBaseSession(workout);

  if (!opts.includeFullData) {
    const weather = opts.includeWeather ? mapWeather(workout.weather_observations ?? null) : null;

    return {
      ...base,
      externalId: null,
      source: null,
      stravaData: null,
      stravaStreams: null,
      averageTemp: weather?.temperature ?? null,
      weather,
    };
  }

  // Type guard to check if workout has full data
  const isFullWorkout = (w: WorkoutBase | WorkoutFull): w is WorkoutFull => {
    return 'external_activities' in w;
  };

  if (!isFullWorkout(workout)) {
    return {
      ...base,
      externalId: null,
      source: null,
      stravaData: null,
      stravaStreams: null,
      averageTemp: null,
      weather: null,
    };
  }

  const external = selectExternalActivity(workout.external_activities);
  const streams = mapStreams(workout.workout_streams);
  const weather = mapWeather(workout.weather_observations);

  return {
    ...base,
    externalId: external?.externalId ?? null,
    source: external?.source ?? null,
    stravaData: external?.external_payloads?.payload as TrainingSession['stravaData'] ?? null,
    stravaStreams: streams as TrainingSession['stravaStreams'] ?? null,
    averageTemp: weather?.temperature ?? null,
    weather,
  };
}

/**
 * Maps a plan session entity to a TrainingSession.
 * 
 * @param plan - Database plan_session entity
 * @param options - Mapping options
 * @returns TrainingSession object
 */
export function mapPlanToSession(
  plan: PlanSessionFull,
  options: SessionMapperOptions = {}
): TrainingSession {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    id: plan.id,
    userId: plan.userId,
    sessionNumber: plan.sessionNumber ?? 0,
    week: plan.week ?? null,
    date: opts.includePlannedDateAsDate && plan.plannedDate ? plan.plannedDate.toISOString() : null,
    sessionType: plan.sessionType || null,
    duration: null,
    distance: null,
    avgPace: null,
    avgHeartRate: null,
    intervalDetails: plan.intervalDetails as TrainingSession['intervalDetails'] | null,
    perceivedExertion: null,
    comments: plan.comments ?? '',
    status: plan.status,
    plannedDate: plan.plannedDate ? plan.plannedDate.toISOString() : null,
    targetPace: plan.targetPace ?? null,
    targetDuration: plan.targetDuration ?? null,
    targetDistance: plan.targetDistance ?? null,
    targetHeartRateBpm: plan.targetHeartRateBpm ?? null,
    targetRPE: plan.targetRPE ?? null,
    recommendationId: plan.recommendationId ?? null,
    externalId: null,
    source: null,
    stravaData: null,
    stravaStreams: null,
    elevationGain: null,
    averageCadence: null,
    averageTemp: null,
    calories: null,
    weather: null,
  };
}
