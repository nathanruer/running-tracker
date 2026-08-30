import 'server-only';
/**
 * Session Mapper - Unified transformation from database entities to TrainingSession.
 */

import { Prisma } from '@prisma/client';
import type { TrainingSession } from '@/lib/types';
import { formatDuration } from '@/lib/utils/duration/format';
import { civilDayInZone } from '@/lib/utils/date/zoned';
import {
  familyLabel,
  intervalDetailsFromV3,
  sessionTypeFromStructure,
  type BlockType,
  type WorkoutFamily,
} from '@/lib/domain/workouts/structure';

// ============================================================================
// Types for mapper inputs (database entity shapes)
// ============================================================================

export interface PlannedWorkoutData {
  id: string;
  userId: string;
  sessionNumber: number | null;
  plannedOn: Date | null;
  family: WorkoutFamily | null;
  structure: Prisma.JsonValue;
  targetDurationS: number | null;
  targetDistanceM: number | null;
  targetPaceSKm: number | null;
  targetHrBpm: number | null;
  targetRpe: number | null;
  recommendationId: string | null;
  status: string;
  notes: string;
}

export interface WorkoutIntervalData {
  position: number;
  kind: BlockType;
  movingS: number | null;
  distanceM: number | null;
  paceSKm: number | null;
  avgHr: number | null;
}

export interface WorkoutSourceData {
  provider: string;
  externalId: string;
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
}

export interface WorkoutStreamsData {
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
  startedAt: Date;
  timezone: string;
  datePrecision: 'instant' | 'day';
  sessionNumber: number | null;
  rpe: number | null;
  notes: string;
  family: WorkoutFamily | null;
  durationS: number | null;
  distanceM: number | null;
  paceSKm: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgCadence: number | null;
  elevationGainM: number | null;
  calories: number | null;
  routePolyline: string | null;
  planned_workout?: PlannedWorkoutData | null;
  workout_intervals?: WorkoutIntervalData[];
  workout_sources?: WorkoutSourceData[];
  weather_observations?: WeatherObservationData | null;
}

export interface WorkoutFull extends WorkoutBase {
  workout_sources: WorkoutSourceData[];
  weather_observations: WeatherObservationData | null;
  workout_streams: WorkoutStreamsData | null;
}

/** Lightweight source flags computed in SQL for the table view. */
export interface ExternalFlags {
  source: string;
  externalId: string;
  hasStreams: boolean;
  streamsStatus: string;
}

// ============================================================================
// Mapper options
// ============================================================================

export interface SessionMapperOptions {
  /**
   * If true, includes sources, weather, and streams data.
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

const STREAM_COLUMNS: Array<[keyof WorkoutStreamsData, string]> = [
  ['time', 'time'],
  ['distance', 'distance'],
  ['velocity', 'velocity_smooth'],
  ['altitude', 'altitude'],
  ['heartrate', 'heartrate'],
  ['cadence', 'cadence'],
];

function selectSource(sources: WorkoutSourceData[]): WorkoutSourceData | null {
  return sources[0] ?? null;
}

function mapStreams(streams: WorkoutStreamsData | null): Record<string, { data: Prisma.JsonValue }> | null {
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
function isStreamsHandled(source: { hasStreams?: boolean; streamsStatus?: string | null } | null): boolean {
  if (!source) return false;
  return source.hasStreams === true || source.streamsStatus === 'not_applicable';
}

function mapWeather(weather: WeatherObservationData | null): TrainingSession['weather'] {
  if (!weather) return null;

  return {
    conditionCode: weather.conditionCode ?? 0,
    temperature: weather.temperature ?? 0,
    apparentTemperature: weather.apparentTemperature ?? undefined,
    humidity: weather.humidity ?? undefined,
    windSpeed: weather.windSpeed ?? 0,
    precipitation: weather.precipitation ?? 0,
    timestamp: weather.observedAt ? weather.observedAt.getTime() : undefined,
  };
}

function planTargets(plan: PlannedWorkoutData | null | undefined) {
  return {
    plannedDate: plan?.plannedOn ? plan.plannedOn.toISOString() : null,
    targetPace: plan?.targetPaceSKm != null ? formatDuration(plan.targetPaceSKm) : null,
    targetDuration: plan?.targetDurationS != null ? Math.round(plan.targetDurationS / 60) : null,
    targetDistance: plan?.targetDistanceM != null ? plan.targetDistanceM / 1000 : null,
    targetHeartRateBpm: plan?.targetHrBpm != null ? String(plan.targetHrBpm) : null,
    targetRPE: plan?.targetRpe ?? null,
    recommendationId: plan?.recommendationId ?? null,
  };
}

// ============================================================================
// Core base session data (shared between full and table views)
// ============================================================================

function buildBaseSession(workout: WorkoutBase): Omit<
  TrainingSession,
  'externalId' | 'source' | 'streams' | 'averageTemp' | 'weather'
> {
  const plan = workout.planned_workout;
  const startedAt = workout.startedAt.toISOString();

  return {
    id: workout.id,
    userId: workout.userId,
    sessionNumber: workout.sessionNumber ?? 0,
    date: startedAt,
    startedAt,
    timezone: workout.timezone,
    datePrecision: workout.datePrecision,
    localDate: civilDayInZone(workout.startedAt, workout.timezone),
    sessionType: familyLabel(workout.family) ?? (plan ? sessionTypeFromStructure(plan.family, plan.structure) : null),
    duration: workout.durationS != null ? formatDuration(workout.durationS) : null,
    distance: workout.distanceM != null ? workout.distanceM / 1000 : null,
    avgPace: workout.paceSKm != null ? formatDuration(workout.paceSKm) : null,
    avgHeartRate: workout.avgHr ?? null,
    maxHeartRate: workout.maxHr ?? null,
    intervalDetails: intervalDetailsFromV3(plan?.structure ?? null, workout.workout_intervals ?? []),
    perceivedExertion: workout.rpe ?? null,
    comments: workout.notes ?? plan?.notes ?? '',
    status: 'completed',
    ...planTargets(plan),
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
      hasStreams = isStreamsHandled(flags);
    } else {
      const selected = workout.workout_sources ? selectSource(workout.workout_sources) : null;
      externalId = selected?.externalId ?? null;
      source = selected?.provider ?? null;
      hasStreams = workout.workout_sources !== undefined ? isStreamsHandled(selected) : undefined;
    }

    const weather = opts.includeWeather ? mapWeather(workout.weather_observations ?? null) : null;
    const hasWeather = workout.weather_observations !== undefined
      ? Boolean(workout.weather_observations)
      : undefined;

    return {
      ...base,
      externalId,
      source,
      streams: null,
      averageTemp: weather?.temperature ?? null,
      weather,
      hasWeather,
      hasStreams,
    } as TrainingSession;
  }

  // Type guard to check if workout has full data
  const isFullWorkout = (w: WorkoutBase | WorkoutFull): w is WorkoutFull => {
    return 'workout_sources' in w && 'workout_streams' in w;
  };

  if (!isFullWorkout(workout)) {
    return {
      ...base,
      externalId: null,
      source: null,
      streams: null,
      averageTemp: null,
      weather: null,
      hasStreams: undefined,
    } as TrainingSession;
  }

  const selected = selectSource(workout.workout_sources);
  const streams = mapStreams(workout.workout_streams);
  const weather = mapWeather(workout.weather_observations);
  const hasWeather = Boolean(workout.weather_observations);
  const hasStreams = streams !== null || isStreamsHandled(selected);

  return {
    ...base,
    externalId: selected?.externalId ?? null,
    source: selected?.provider ?? null,
    streams: streams as TrainingSession['streams'] ?? null,
    averageTemp: weather?.temperature ?? null,
    weather,
    hasWeather,
    hasStreams,
  } as TrainingSession;
}

/**
 * Maps a planned_workouts entity (not yet linked to a workout) to a TrainingSession.
 */
export function mapPlannedWorkoutToSession(
  plan: PlannedWorkoutData,
  options: SessionMapperOptions = {}
): TrainingSession {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const plannedDate = plan.plannedOn ? plan.plannedOn.toISOString() : null;

  return {
    id: plan.id,
    userId: plan.userId,
    sessionNumber: plan.sessionNumber ?? 0,
    date: opts.includePlannedDateAsDate ? plannedDate : null,
    sessionType: sessionTypeFromStructure(plan.family, plan.structure),
    duration: null,
    distance: null,
    avgPace: null,
    avgHeartRate: null,
    intervalDetails: intervalDetailsFromV3(plan.structure),
    perceivedExertion: null,
    comments: plan.notes ?? '',
    status: plan.status === 'completed' ? 'completed' : 'planned',
    ...planTargets(plan),
    externalId: null,
    source: null,
    streams: null,
    elevationGain: null,
    averageCadence: null,
    averageTemp: null,
    calories: null,
    weather: null,
    hasStreams: undefined,
  } as TrainingSession;
}
