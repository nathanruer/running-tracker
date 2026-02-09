/**
 * Entity schemas - Complete Zod schemas for domain entities
 * 
 * These schemas define the full structure of entities as stored in the database.
 * Types are inferred from these schemas to ensure type safety and consistency.
 */

import { z } from 'zod';
import { VALIDATION_MESSAGES } from '@/lib/constants/messages';
import {
  nullableDurationSchema,
  nullablePaceSchema,
  nullableHeartRateSchema,
  nullablePositiveNumberSchema,
} from './primitives';

// ============================================================================
// STEP TYPE ENUM
// ============================================================================

export const stepTypeEnum = z.enum(['warmup', 'effort', 'recovery', 'cooldown']);

// ============================================================================
// INTERVAL STEP SCHEMA
// ============================================================================

/**
 * Schema for individual interval steps within a workout
 */
export const intervalStepEntitySchema = z.object({
  stepNumber: z.number().min(1, { message: VALIDATION_MESSAGES.STEP_NUMBER_REQUIRED }).optional(),
  stepType: stepTypeEnum,
  duration: nullableDurationSchema,
  distance: nullablePositiveNumberSchema,
  pace: nullablePaceSchema,
  hr: nullableHeartRateSchema,
  hrRange: z.string().nullable().optional(),
});

// ============================================================================
// INTERVAL DETAILS SCHEMA
// ============================================================================

/**
 * Schema for interval workout details
 */
export const intervalDetailsEntitySchema = z.object({
  workoutType: z.string().nullable(),
  repetitionCount: z.number().min(1, { message: VALIDATION_MESSAGES.REPETITION_MIN }).nullable(),
  effortDuration: nullableDurationSchema,
  recoveryDuration: nullableDurationSchema,
  effortDistance: nullablePositiveNumberSchema,
  recoveryDistance: nullablePositiveNumberSchema,
  targetEffortPace: nullablePaceSchema,
  targetEffortHR: nullableHeartRateSchema,
  targetRecoveryPace: nullablePaceSchema,
  steps: z.array(intervalStepEntitySchema),
});

// ============================================================================
// WEATHER DATA SCHEMA
// ============================================================================

export const weatherDataSchema = z.object({
  conditionCode: z.number(),
  temperature: z.number(),
  apparentTemperature: z.number().optional(),
  humidity: z.number().optional(),
  windSpeed: z.number(),
  precipitation: z.number(),
  timestamp: z.number().optional(),
});

// ============================================================================
// STRAVA ACTIVITY SCHEMA (for stored data)
// ============================================================================

export const stravaActivitySchema = z.object({
  id: z.number(),
  name: z.string(),
  distance: z.number(),
  moving_time: z.number(),
  elapsed_time: z.number(),
  total_elevation_gain: z.number(),
  type: z.string(),
  start_date: z.string(),
  start_date_local: z.string(),
  average_speed: z.number(),
  max_speed: z.number(),
  average_heartrate: z.number().optional(),
  max_heartrate: z.number().optional(),
  average_cadence: z.number().optional(),
  average_temp: z.number().optional(),
  elev_high: z.number().optional(),
  elev_low: z.number().optional(),
  calories: z.number().optional(),
  map: z.object({
    id: z.string(),
    summary_polyline: z.string(),
  }).optional(),
  external_id: z.string().nullish(),
  upload_id: z.number().nullish(),
});

// ============================================================================
// STRAVA STREAM SCHEMA
// ============================================================================

export const stravaStreamSchema = z.object({
  data: z.array(z.number()).min(1),
  series_type: z.enum(['time', 'distance']),
  original_size: z.number().positive(),
  resolution: z.enum(['low', 'medium', 'high']),
});

export const stravaStreamSetSchema = z.record(z.string(), stravaStreamSchema);

// ============================================================================
// STRAVA TOKENS SCHEMA (OAuth)
// ============================================================================

export const stravaTokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
});

// ============================================================================
// TRAINING SESSION ENTITY SCHEMA
// ============================================================================

/**
 * Complete schema for a training session entity
 * This represents the full session as stored in the database
 */
export const trainingSessionEntitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  sessionNumber: z.number(),
    week: z.number().nullable(),
  date: z.string().nullable(),
  sessionType: z.string().nullable(),
  duration: z.string().nullable(),
  distance: z.number().nullable(),
  avgPace: z.string().nullable(),
  avgHeartRate: z.number().nullable(),
  intervalDetails: intervalDetailsEntitySchema.nullable().optional(),
  perceivedExertion: z.number().nullable().optional(),
  comments: z.string(),
  status: z.string(),
  plannedDate: z.string().nullable().optional(),
  targetPace: z.string().nullable().optional(),
  targetDuration: z.number().nullable().optional(),
  targetDistance: z.number().nullable().optional(),
  targetHeartRateBpm: z.union([z.string(), z.number()]).nullable().optional(),
  targetRPE: z.number().nullable().optional(),
  recommendationId: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  stravaData: stravaActivitySchema.nullable().optional(),
  stravaStreams: stravaStreamSetSchema.nullable().optional(),
  elevationGain: z.number().nullable().optional(),
  averageCadence: z.number().nullable().optional(),
  averageTemp: z.number().nullable().optional(),
  calories: z.number().nullable().optional(),
  weather: weatherDataSchema.nullable().optional(),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type StepType = z.infer<typeof stepTypeEnum>;
export type IntervalStep = z.infer<typeof intervalStepEntitySchema>;
export type IntervalDetails = z.infer<typeof intervalDetailsEntitySchema>;
export type WeatherData = z.infer<typeof weatherDataSchema>;
export type StravaActivity = z.infer<typeof stravaActivitySchema>;
export type StravaStream = z.infer<typeof stravaStreamSchema>;
export type StravaStreamSet = z.infer<typeof stravaStreamSetSchema>;
export type TrainingSession = z.infer<typeof trainingSessionEntitySchema>;

// ============================================================================
// PAYLOAD TYPES (derived from TrainingSession)
// ============================================================================

/**
 * Payload for creating/updating a completed session
 */
export type TrainingSessionPayload = Omit<
  TrainingSession,
  'id' | 'userId' | 'sessionNumber' | 'week' | 'status' | 'plannedDate' | 'targetPace' | 'targetDuration' | 'targetDistance' | 'targetRPE'
>;

/**
 * Payload for updating a completed session
 * Includes all fields that can be edited on a completed session
 */
export type CompletedSessionUpdatePayload = {
  sessionType: string | null;
  duration?: string;
  distance?: number | null;
  avgPace?: string;
  avgHeartRate?: number | null;
  perceivedExertion?: number | null;
  intervalDetails?: IntervalDetails | null;
  comments?: string;
};

export type PlannedSessionPayload = {
  plannedDate: string | null;
  sessionType: string | null;
  targetDuration: number | null;
  targetDistance: number | null;
  targetPace: string | null;
  targetHeartRateBpm: string | number | null;
  targetRPE: number | null;
  intervalDetails?: IntervalDetails | null;
  comments: string;
  externalId?: string | null;
  source?: string | null;
  recommendationId?: string | null;
};
