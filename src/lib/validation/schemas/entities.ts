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
// STREAM SCHEMA (one series per type: time, distance, velocity_smooth, heartrate, cadence, altitude)
// ============================================================================

export const streamSchema = z.object({
  data: z.array(z.number()).min(1),
});

export const streamSetSchema = z.record(z.string(), streamSchema);

// ============================================================================
// TRAINING SESSION ENTITY SCHEMA
// ============================================================================

const trainingSessionBaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sessionNumber: z.number(),
  sessionType: z.string().nullable(),
  intervalDetails: intervalDetailsEntitySchema.nullable().optional(),
  perceivedExertion: z.number().nullable().optional(),
  comments: z.string(),
  recommendationId: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  streams: streamSetSchema.nullable().optional(),
  elevationGain: z.number().nullable().optional(),
  averageCadence: z.number().nullable().optional(),
  averageTemp: z.number().nullable().optional(),
  calories: z.number().nullable().optional(),
  weather: weatherDataSchema.nullable().optional(),
  hasWeather: z.boolean().optional(),
  hasStreams: z.boolean().optional(),
  startedAt: z.string().nullable().optional(),
  timezone: z.string().optional(),
  datePrecision: z.enum(['instant', 'day']).optional(),
  localDate: z.string().optional(),
  routePolyline: z.string().nullable().optional(),
  maxHeartRate: z.number().nullable().optional(),
});

export const plannedSessionEntitySchema = trainingSessionBaseSchema.extend({
  status: z.literal('planned'),
  date: z.string().nullable(),
  plannedDate: z.string().nullable(),
  duration: z.string().nullable().optional(),
  distance: z.number().nullable().optional(),
  avgPace: z.string().nullable().optional(),
  avgHeartRate: z.number().nullable().optional(),
  targetPace: z.string().nullable().optional(),
  targetDuration: z.number().nullable().optional(),
  targetDistance: z.number().nullable().optional(),
  targetHeartRateBpm: z.union([z.string(), z.number()]).nullable().optional(),
  targetRPE: z.number().nullable().optional(),
});

export const completedSessionEntitySchema = trainingSessionBaseSchema.extend({
  status: z.literal('completed'),
  date: z.string(),
  plannedDate: z.string().nullable().optional(),
  duration: z.string().nullable(),
  distance: z.number().nullable(),
  avgPace: z.string().nullable(),
  avgHeartRate: z.number().nullable(),
  targetPace: z.string().nullable().optional(),
  targetDuration: z.number().nullable().optional(),
  targetDistance: z.number().nullable().optional(),
  targetHeartRateBpm: z.union([z.string(), z.number()]).nullable().optional(),
  targetRPE: z.number().nullable().optional(),
});

/**
 * Complete schema for a training session entity
 * This represents the full session as stored in the database
 */
export const trainingSessionEntitySchema = z.discriminatedUnion('status', [
  completedSessionEntitySchema,
  plannedSessionEntitySchema,
]);

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type StepType = z.infer<typeof stepTypeEnum>;
export type IntervalStep = z.infer<typeof intervalStepEntitySchema>;
export type IntervalDetails = z.infer<typeof intervalDetailsEntitySchema>;
export type WeatherData = z.infer<typeof weatherDataSchema>;
export type Stream = z.infer<typeof streamSchema>;
export type StreamSet = z.infer<typeof streamSetSchema>;
export type PlannedSession = z.infer<typeof plannedSessionEntitySchema>;
export type CompletedSession = z.infer<typeof completedSessionEntitySchema>;
export type TrainingSession = z.infer<typeof trainingSessionEntitySchema>;

// ============================================================================
// PAYLOAD TYPES (derived from TrainingSession)
// ============================================================================

/**
 * Payload for creating/updating a completed session
 */
export type TrainingSessionPayload = (Omit<
  CompletedSession,
  'id' | 'userId' | 'sessionNumber' | 'status' | 'plannedDate' | 'targetPace' | 'targetDuration' | 'targetDistance' | 'targetRPE' | 'hasWeather' | 'hasStreams'
>) & {
  sourcePayload?: unknown;
  intervalsSource?: 'detected' | 'manual';
};

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
