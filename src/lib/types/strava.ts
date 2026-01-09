/**
 * Strava types
 * 
 * Core types (StravaActivity, StravaStream, StravaStreamSet) are now
 * re-exported from Zod schemas for consistency.
 * 
 * Additional types specific to Strava API (StravaTokens, StravaStreamType)
 * are defined here.
 */

export type {
  StravaActivity,
  StravaStream,
  StravaStreamSet,
} from '@/lib/validation/schemas/entities';

export {
  stravaActivityStoredSchema,
  stravaStreamSchema,
  stravaStreamSetSchema,
} from '@/lib/validation/schemas/entities';

// ============================================================================
// STRAVA API SPECIFIC TYPES
// ============================================================================

/**
 * Strava OAuth tokens
 */
export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

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
