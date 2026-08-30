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

/**
 * Real start instant of a session. A provider instant (`startedAt` with offset) wins; a bare day
 * means day precision at local midnight; a wall-clock date is read in the athlete timezone.
 */
export function resolveStartedAt(
  payloadDate: unknown,
  providerStartedAt: unknown,
  timezone: string
): { startedAt: Date; datePrecision: 'instant' | 'day' } {
  if (typeof providerStartedAt === 'string' && hasExplicitOffset(providerStartedAt)) {
    const instant = new Date(providerStartedAt);
    if (!Number.isNaN(instant.getTime())) return { startedAt: instant, datePrecision: 'instant' };
  }

  const raw = String(payloadDate ?? '').trim();
  if (isDayOnly(raw)) return { startedAt: zonedDayStart(raw, timezone), datePrecision: 'day' };

  const instant = hasExplicitOffset(raw) ? new Date(raw) : (zonedWallTime(raw, timezone) ?? new Date(raw));
  if (Number.isNaN(instant.getTime())) throw new Error(`Date de séance invalide: ${raw}`);
  return { startedAt: instant, datePrecision: 'instant' };
}

export function toProvider(source: string | null): 'intervals_icu' | null {
  return source === 'intervals_icu' ? source : null;
}

export function polylineOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function maxHeartRate(payload: JsonRecord, streams: JsonRecord | null): number | null {
  const fromPayload = roundedInt(payload.maxHeartRate);
  if (fromPayload != null) return fromPayload;

  const data = asRecord(streams?.heartrate)?.data;
  if (!Array.isArray(data)) return null;
  let max: number | null = null;
  for (const value of data) {
    if (typeof value === 'number' && Number.isFinite(value) && (max == null || value > max)) max = value;
  }
  return max == null ? null : Math.round(max);
}

export function buildWorkoutV3(payload: JsonRecord, streams: unknown, timezone: string) {
  const distanceKm = payload.distance != null ? Number(payload.distance) : NaN;

  return {
    ...resolveStartedAt(payload.date, payload.startedAt, timezone),
    timezone,
    durationS: payload.duration ? parseDuration(String(payload.duration)) : null,
    distanceM: Number.isFinite(distanceKm) ? Math.round(distanceKm * 1000) : null,
    paceSKm: payload.avgPace ? parseDuration(String(payload.avgPace)) : null,
    avgHr: roundedInt(payload.avgHeartRate),
    maxHr: maxHeartRate(payload, asRecord(streams)),
    avgCadence: finiteNumber(payload.averageCadence),
    elevationGainM: finiteNumber(payload.elevationGain),
    calories: roundedInt(payload.calories),
    routePolyline: polylineOf(payload.routePolyline),
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
