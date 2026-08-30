import 'server-only';
/**
 * Session Mapper - Unified transformation from database entities to TrainingSession.
 */

import { Prisma } from '@prisma/client';
import type { TrainingSession } from '@/lib/types';
import { formatDuration } from '@/lib/utils/duration/format';
import { civilDayInZone } from '@/lib/utils/date/zoned';
import {
  isLikelyStreamlessFromFields,
  isStravaActivityLikelyStreamless,
} from '@/server/domain/sessions/stream-eligibility';

// ============================================================================
// Types for mapper inputs (database entity shapes)
// ============================================================================

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
  sourceStatus?: string | null;
  rawPayload?: Prisma.JsonValue | null;
  hasStreams?: boolean;
  streamsStatus?: string | null;
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

export interface WorkoutStreamsV3Data {
  time: Prisma.JsonValue | null;
  distance: Prisma.JsonValue | null;
  velocity: Prisma.JsonValue | null;
  altitude: Prisma.JsonValue | null;
  heartrate: Prisma.JsonValue | null;
  cadence: Prisma.JsonValue | null;
}

export interface WorkoutBase {
  id: string;
  userId: string;
  planSessionId: string | null;
  startedAt: Date;
  timezone: string;
  datePrecision: 'instant' | 'day';
  status: string;
  sessionNumber: number | null;
  week: number | null;
  sessionType: string | null;
  comments: string;
  perceivedExertion: number | null;
  durationS: number | null;
  distanceM: number | null;
  paceSKm: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgCadence: number | null;
  elevationGainM: number | null;
  calories: number | null;
  routePolyline: string | null;
  plan_sessions: PlanSessionData | null;
  external_activities?: ExternalActivityData[];
  weather_observations?: WeatherObservationData | null;
}

export interface WorkoutFull extends WorkoutBase {
  external_activities: ExternalActivityData[];
  weather_observations: WeatherObservationData | null;
  workout_streams_v3: WorkoutStreamsV3Data | null;
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

/** Lightweight external activity flags computed in SQL for the table view. */
export interface ExternalFlags {
  source: string;
  externalId: string;
  sourceStatus: string | null;
  hasPayload: boolean;
  hasPolyline: boolean;
  manual: boolean;
  externalIdFieldNull: boolean | null;
  uploadIdFieldNull: boolean | null;
  hasStreams: boolean;
  streamsStatus: string;
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

  externalFlags?: ExternalFlags | null;

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

const STREAM_COLUMNS: Array<[keyof WorkoutStreamsV3Data, string]> = [
  ['time', 'time'],
  ['distance', 'distance'],
  ['velocity', 'velocity_smooth'],
  ['altitude', 'altitude'],
  ['heartrate', 'heartrate'],
  ['cadence', 'cadence'],
];

function selectExternalActivity(activities: ExternalActivityData[]): ExternalActivityData | null {
  if (!activities.length) return null;
  const strava = activities.find((activity) => activity.source === 'strava');
  return strava ?? activities[0];
}

function mapStreams(streams: WorkoutStreamsV3Data | null): Record<string, { data: Prisma.JsonValue }> | null {
  if (!streams) return null;

  const result: Record<string, { data: Prisma.JsonValue }> = {};
  for (const [column, streamType] of STREAM_COLUMNS) {
    const data = streams[column];
    if (Array.isArray(data) && data.length) {
      result[streamType] = { data };
    }
  }

  return Object.keys(result).length ? result : null;
}

/** True when streams are stored or known to be unavailable, i.e. nothing left to enrich. */
function isStreamsHandled(external: ExternalActivityData | null): boolean {
  if (!external) return false;
  return (
    external.hasStreams === true
    || external.streamsStatus === 'not_applicable'
    || external.sourceStatus === 'no_streams'
    || !external.rawPayload
    || isStravaActivityLikelyStreamless(external.rawPayload)
  );
}

function isStreamsHandledFromFlags(flags: ExternalFlags | null): boolean {
  if (!flags) return false;
  return (
    flags.hasStreams
    || flags.streamsStatus === 'not_applicable'
    || flags.sourceStatus === 'no_streams'
    || !flags.hasPayload
    || isLikelyStreamlessFromFields(flags)
  );
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
  const plan = workout.plan_sessions;
  const startedAt = workout.startedAt.toISOString();

  return {
    id: workout.id,
    userId: workout.userId,
    sessionNumber: workout.sessionNumber ?? 0,
    week: workout.week ?? null,
    date: startedAt,
    startedAt,
    timezone: workout.timezone,
    datePrecision: workout.datePrecision,
    localDate: civilDayInZone(workout.startedAt, workout.timezone),
    sessionType: workout.sessionType || plan?.sessionType || null,
    duration: workout.durationS != null ? formatDuration(workout.durationS) : null,
    distance: workout.distanceM != null ? workout.distanceM / 1000 : null,
    avgPace: workout.paceSKm != null ? formatDuration(workout.paceSKm) : null,
    avgHeartRate: workout.avgHr ?? null,
    maxHeartRate: workout.maxHr ?? null,
    intervalDetails: plan?.intervalDetails as TrainingSession['intervalDetails'] | null,
    perceivedExertion: workout.perceivedExertion ?? null,
    comments: workout.comments ?? plan?.comments ?? '',
    status: workout.status as 'planned' | 'completed',
    plannedDate: plan?.plannedDate ? plan.plannedDate.toISOString() : null,
    targetPace: plan?.targetPace ?? null,
    targetDuration: plan?.targetDuration ?? null,
    targetDistance: plan?.targetDistance ?? null,
    targetHeartRateBpm: plan?.targetHeartRateBpm ?? null,
    targetRPE: plan?.targetRPE ?? null,
    recommendationId: plan?.recommendationId ?? null,
    elevationGain: workout.elevationGainM ?? null,
    averageCadence: workout.avgCadence ?? null,
    calories: workout.calories ?? null,
    routePolyline: workout.routePolyline ?? null,
  };
}

// ============================================================================
// Public mapper functions
// ============================================================================

/**
 * Maps a workout entity to a TrainingSession.
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
    let externalId: string | null;
    let source: string | null;
    let hasStreams: boolean | undefined;

    if (opts.externalFlags !== undefined) {
      const flags = opts.externalFlags;
      externalId = flags?.externalId ?? null;
      source = flags?.source ?? null;
      hasStreams = isStreamsHandledFromFlags(flags);
    } else {
      const external = workout.external_activities
        ? selectExternalActivity(workout.external_activities)
        : null;
      externalId = external?.externalId ?? null;
      source = external?.source ?? null;
      hasStreams = workout.external_activities !== undefined ? isStreamsHandled(external) : undefined;
    }

    const weather = opts.includeWeather ? mapWeather(workout.weather_observations ?? null) : null;
    const hasWeather = workout.weather_observations !== undefined
      ? Boolean(workout.weather_observations)
      : undefined;

    return {
      ...base,
      externalId,
      source,
      stravaData: null,
      stravaStreams: null,
      averageTemp: weather?.temperature ?? null,
      weather,
      hasWeather,
      hasStreams,
    } as TrainingSession;
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
      hasStreams: undefined,
    } as TrainingSession;
  }

  const external = selectExternalActivity(workout.external_activities);
  const streams = mapStreams(workout.workout_streams_v3);
  const weather = mapWeather(workout.weather_observations);
  const hasWeather = Boolean(workout.weather_observations);
  const hasStreams = streams !== null || isStreamsHandled(external);

  return {
    ...base,
    externalId: external?.externalId ?? null,
    source: external?.source ?? null,
    stravaData: external?.rawPayload as TrainingSession['stravaData'] ?? null,
    stravaStreams: streams as TrainingSession['stravaStreams'] ?? null,
    averageTemp: weather?.temperature ?? null,
    weather,
    hasWeather,
    hasStreams,
  } as TrainingSession;
}

/**
 * Maps a plan session entity to a TrainingSession.
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
    status: plan.status as 'planned' | 'completed',
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
    hasStreams: undefined,
  } as TrainingSession;
}
