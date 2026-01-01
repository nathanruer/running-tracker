import { z } from 'zod';

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
  external_id: z.string().optional(),
  upload_id: z.number().optional(),
});

export type StravaActivityValidated = z.infer<typeof stravaActivitySchema>;

/**
 * Safely validates and parses stravaData from unknown JSON
 * Returns null if validation fails
 */
export function validateStravaData(data: unknown): StravaActivityValidated | null {
  try {
    return stravaActivitySchema.parse(data);
  } catch {
    return null;
  }
}
