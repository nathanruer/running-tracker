/**
 * Strava types
 *
 * Core types are re-exported from Zod schemas for consistency.
 */

import { z } from 'zod';

export type {
  StravaActivity,
  StravaStream,
  StravaStreamSet,
} from '@/lib/validation/schemas/entities';

export {
  stravaActivitySchema,
  stravaStreamSchema,
  stravaStreamSetSchema,
  stravaTokensSchema,
} from '@/lib/validation/schemas/entities';

import { stravaTokensSchema } from '@/lib/validation/schemas/entities';

export type StravaTokens = z.infer<typeof stravaTokensSchema>;

/**
 * Available stream types from Strava API
 */
export type StravaStreamType =
  | 'time'
  | 'distance'
  | 'velocity_smooth'
  | 'heartrate'
  | 'cadence'
  | 'altitude'
  | 'grade_smooth';
