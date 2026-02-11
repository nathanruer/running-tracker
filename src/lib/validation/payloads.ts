import { z } from 'zod';
import {
  stravaActivitySchema,
  stravaStreamSchema,
  weatherDataSchema,
} from './schemas/entities';

export const weatherPayloadSchema = weatherDataSchema.partial().passthrough();

// Payload parsing is intentionally more tolerant than strict entity validation:
// Strava manual/non-GPS activities may expose `map` with null/empty polyline.
const stravaPayloadMapSchema = z.object({
  id: z.string().nullish(),
  summary_polyline: z.string().nullish(),
}).passthrough();

export const stravaPayloadSchema = stravaActivitySchema
  .partial()
  .extend({
    map: stravaPayloadMapSchema.nullish(),
  })
  .passthrough();

export const stravaStreamPayloadSchema = z.record(
  z.string(),
  stravaStreamSchema.partial().passthrough()
);
