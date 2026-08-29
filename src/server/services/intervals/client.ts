import 'server-only';
import { z } from 'zod';

const BASE_URL = 'https://intervals.icu/api/v1';
const REQUEST_TIMEOUT_MS = 10_000;

export const intervalsActivitySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  start_date_local: z.string(),
  start_date: z.string().nullish(),
  type: z.string().nullish(),
  name: z.string().nullish(),
  distance: z.number().nullish(),
  moving_time: z.number().nullish(),
  elapsed_time: z.number().nullish(),
  total_elevation_gain: z.number().nullish(),
  average_speed: z.number().nullish(),
  max_speed: z.number().nullish(),
  average_heartrate: z.number().nullish(),
  max_heartrate: z.number().nullish(),
  average_cadence: z.number().nullish(),
  calories: z.number().nullish(),
  external_id: z.string().nullish(),
}).loose();

export type IntervalsActivity = z.infer<typeof intervalsActivitySchema>;

const intervalsStreamSchema = z.object({
  type: z.string(),
  data: z.array(z.unknown()),
}).loose();

export type IntervalsStream = z.infer<typeof intervalsStreamSchema>;

const intervalsAthleteSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
}).loose();

export type IntervalsAthlete = z.infer<typeof intervalsAthleteSchema>;

async function fetchIntervals(apiKey: string, path: string): Promise<unknown> {
  const auth = Buffer.from(`API_KEY:${apiKey}`).toString('base64');

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(
      `intervals.icu request failed: ${response.status} ${body.slice(0, 200)}`
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function getIntervalsAthlete(apiKey: string): Promise<IntervalsAthlete> {
  const data = await fetchIntervals(apiKey, '/athlete/0');
  return intervalsAthleteSchema.parse(data);
}

export async function getIntervalsActivities(
  apiKey: string,
  oldest: string,
  newest: string
): Promise<IntervalsActivity[]> {
  const params = new URLSearchParams({ oldest, newest });
  const data = await fetchIntervals(apiKey, `/athlete/0/activities?${params}`);
  return z.array(intervalsActivitySchema).parse(data);
}

const intervalsMapSchema = z.object({
  latlngs: z.array(z.unknown()).nullish(),
}).loose();

export async function getIntervalsActivityMap(
  apiKey: string,
  activityId: string
): Promise<unknown[]> {
  const data = await fetchIntervals(apiKey, `/activity/${activityId}/map`);
  return intervalsMapSchema.parse(data).latlngs ?? [];
}

export async function getIntervalsActivityStreams(
  apiKey: string,
  activityId: string
): Promise<IntervalsStream[]> {
  // No `types` filter: intervals.icu returns latlng as all-null when it is requested explicitly.
  const data = await fetchIntervals(apiKey, `/activity/${activityId}/streams`);
  return z.array(intervalsStreamSchema).parse(data);
}
