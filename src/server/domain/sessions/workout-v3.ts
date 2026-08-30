import 'server-only';
import { Prisma } from '@prisma/client';
import { parseDuration } from '@/lib/utils/duration/parse';
import { hasExplicitOffset, isDayOnly, zonedDayStart, zonedWallTime } from '@/lib/utils/date/zoned';

export const DEFAULT_TIMEZONE = 'Europe/Paris';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundedInt(value: unknown): number | null {
  const n = finiteNumber(value);
  return n == null ? null : Math.round(n);
}

export function resolveStartedAt(
  payloadDate: unknown,
  activity: JsonRecord | null,
  timezone: string
): { startedAt: Date; datePrecision: 'instant' | 'day' } {
  const externalStart = typeof activity?.start_date === 'string' ? activity.start_date : null;
  if (externalStart && hasExplicitOffset(externalStart)) {
    const instant = new Date(externalStart);
    if (!Number.isNaN(instant.getTime())) return { startedAt: instant, datePrecision: 'instant' };
  }

  const raw = String(payloadDate ?? '').trim();
  if (isDayOnly(raw)) return { startedAt: zonedDayStart(raw, timezone), datePrecision: 'day' };

  const instant = hasExplicitOffset(raw) ? new Date(raw) : (zonedWallTime(raw, timezone) ?? new Date(raw));
  if (Number.isNaN(instant.getTime())) throw new Error(`Date de séance invalide: ${raw}`);
  return { startedAt: instant, datePrecision: 'instant' };
}

export function routePolylineFromActivity(activity: JsonRecord | null): string | null {
  const polyline = asRecord(activity?.map)?.summary_polyline;
  return typeof polyline === 'string' && polyline.trim() ? polyline : null;
}

export function payloadKindOf(activity: JsonRecord | null): 'detail' | 'summary' {
  return activity && 'start_latlng' in activity ? 'detail' : 'summary';
}

export function toProvider(source: string | null): 'strava' | 'intervals_icu' | null {
  return source === 'strava' || source === 'intervals_icu' ? source : null;
}

function maxHeartRate(activity: JsonRecord | null, streams: JsonRecord | null): number | null {
  const fromActivity = roundedInt(activity?.max_heartrate);
  if (fromActivity != null) return fromActivity;

  const data = asRecord(streams?.heartrate)?.data;
  if (!Array.isArray(data)) return null;
  let max: number | null = null;
  for (const value of data) {
    if (typeof value === 'number' && Number.isFinite(value) && (max == null || value > max)) max = value;
  }
  return max == null ? null : Math.round(max);
}

export function buildWorkoutV3(payload: JsonRecord, activity: unknown, streams: unknown, timezone: string) {
  const activityRecord = asRecord(activity);
  const distanceKm = payload.distance != null ? Number(payload.distance) : NaN;

  return {
    ...resolveStartedAt(payload.date, activityRecord, timezone),
    timezone,
    durationS: payload.duration ? parseDuration(String(payload.duration)) : null,
    distanceM: Number.isFinite(distanceKm) ? Math.round(distanceKm * 1000) : null,
    paceSKm: payload.avgPace ? parseDuration(String(payload.avgPace)) : null,
    avgHr: roundedInt(payload.avgHeartRate),
    maxHr: maxHeartRate(activityRecord, asRecord(streams)),
    avgCadence: finiteNumber(payload.averageCadence),
    elevationGainM: finiteNumber(payload.elevationGain),
    calories: roundedInt(payload.calories),
    routePolyline: routePolylineFromActivity(activityRecord),
  };
}

export function buildStreamsV3(streams: JsonRecord | null) {
  if (!streams) return null;

  const series = (type: string) => {
    const data = asRecord(streams[type])?.data;
    return Array.isArray(data) ? (data as Prisma.InputJsonValue) : Prisma.DbNull;
  };
  const columns = {
    time: series('time'),
    distance: series('distance'),
    velocity: series('velocity_smooth'),
    altitude: series('altitude'),
    heartrate: series('heartrate'),
    cadence: series('cadence'),
  };
  const first = Object.values(columns).find((value) => Array.isArray(value));
  if (!first) return null;

  return { ...columns, sampleCount: (first as unknown[]).length };
}
