import { z } from 'zod';
import { stravaActivitySchema, type StravaActivity } from './schemas/entities';

export { stravaActivitySchema };
export type StravaActivityValidated = StravaActivity;

export const stravaMapSchema = z.object({
  start_date: z.string().optional(),
  map: z.object({
    id: z.string().optional(),
    summary_polyline: z.string(),
  }).optional(),
}).loose();

export type StravaMapData = z.infer<typeof stravaMapSchema>;

export function validateStravaData(data: unknown): StravaActivityValidated | null {
  try {
    return stravaActivitySchema.parse(data);
  } catch {
    return null;
  }
}

export function validateStravaMap(data: unknown): StravaMapData | null {
  try {
    return stravaMapSchema.parse(data);
  } catch {
    return null;
  }
}

export const stravaStreamSchema = z.object({
  data: z.array(z.number()).min(1),
  series_type: z.enum(['time', 'distance']),
  original_size: z.number().positive(),
  resolution: z.enum(['low', 'medium', 'high']),
});

export const stravaStreamSetSchema = z.record(z.string(), stravaStreamSchema);

export function validateStravaStreams(data: unknown): Record<string, unknown> | null {
  try {
    return stravaStreamSetSchema.parse(data);
  } catch {
    return null;
  }
}
