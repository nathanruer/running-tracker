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

function getApiKey(): string {
  const key = process.env.INTERVALS_ICU_API_KEY;
  if (!key) {
    throw new Error('Clé API intervals.icu manquante (INTERVALS_ICU_API_KEY)');
  }
  return key;
}

export function isIntervalsConfigured(): boolean {
  return !!process.env.INTERVALS_ICU_API_KEY;
}

async function fetchIntervals(path: string): Promise<unknown> {
  const auth = Buffer.from(`API_KEY:${getApiKey()}`).toString('base64');

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

export async function getIntervalsActivities(
  oldest: string,
  newest: string
): Promise<IntervalsActivity[]> {
  const params = new URLSearchParams({ oldest, newest });
  const data = await fetchIntervals(`/athlete/0/activities?${params}`);
  return z.array(intervalsActivitySchema).parse(data);
}

export async function getIntervalsActivityStreams(
  activityId: string
): Promise<IntervalsStream[]> {
  const types = ['time', 'distance', 'velocity_smooth', 'heartrate', 'cadence', 'altitude', 'latlng'];
  const params = new URLSearchParams({ types: types.join(',') });
  const data = await fetchIntervals(`/activity/${activityId}/streams?${params}`);
  return z.array(intervalsStreamSchema).parse(data);
}
