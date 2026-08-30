import 'server-only';
import { formatDuration } from '@/lib/utils/duration';
import type { IntervalsActivity, IntervalsStream } from './client';

export const INTERVALS_SOURCE = 'intervals_icu';

export const IMPORTABLE_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);

const MAX_POLYLINE_POINTS = 400;

function encodeNumber(value: number, output: string[]) {
  let v = value < 0 ? ~(value << 1) : value << 1;
  while (v >= 0x20) {
    output.push(String.fromCharCode((0x20 | (v & 0x1f)) + 63));
    v >>= 5;
  }
  output.push(String.fromCharCode(v + 63));
}

export function encodePolyline(points: Array<[number, number]>): string {
  const output: string[] = [];
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of points) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    encodeNumber(latE5 - prevLat, output);
    encodeNumber(lngE5 - prevLng, output);
    prevLat = latE5;
    prevLng = lngE5;
  }

  return output.join('');
}

function downsample<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}

function isLatLngPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

export function buildPolylineFromLatLngs(latlngs: unknown[]): string | null {
  const pairs = latlngs.filter(isLatLngPair);
  if (pairs.length < 2) return null;

  return encodePolyline(downsample(pairs, MAX_POLYLINE_POINTS));
}

const MAPPED_STREAM_TYPES = new Set([
  'time',
  'distance',
  'velocity_smooth',
  'heartrate',
  'cadence',
  'altitude',
]);

export function mapStreams(streams: IntervalsStream[]): Record<string, { data: number[] }> | null {
  const result: Record<string, { data: number[] }> = {};

  for (const stream of streams) {
    if (!MAPPED_STREAM_TYPES.has(stream.type)) continue;
    const data = stream.data.filter((v): v is number => typeof v === 'number');
    if (data.length === 0) continue;
    result[stream.type] = { data };
  }

  return Object.keys(result).length ? result : null;
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0 || durationSeconds <= 0) return '00:00';
  return formatDuration(Math.round(durationSeconds / distanceKm));
}

export function mapIntervalsActivityToSessionPayload(
  activity: IntervalsActivity,
  streams: IntervalsStream[],
  polyline: string | null = null
) {
  const movingSeconds = activity.moving_time ?? activity.elapsed_time ?? 0;
  // A few uploads reach intervals.icu without their summary distance: rebuild it from the pace.
  const distanceM = activity.distance ?? (activity.average_speed ? activity.average_speed * movingSeconds : 0);
  const distanceKm = distanceM / 1000;

  return {
    date: activity.start_date_local,
    startedAt: activity.start_date ?? null,
    sessionType: null,
    duration: formatDuration(movingSeconds),
    distance: Math.round(distanceKm * 100) / 100,
    avgPace: formatPace(distanceKm, movingSeconds),
    avgHeartRate: activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null,
    maxHeartRate: activity.max_heartrate != null ? Math.round(activity.max_heartrate) : null,
    perceivedExertion: null,
    comments: activity.name ?? '',
    externalId: activity.id,
    source: INTERVALS_SOURCE,
    routePolyline: polyline,
    streams: mapStreams(streams),
    sourcePayload: activity,
    elevationGain: activity.total_elevation_gain ?? null,
    averageCadence: activity.average_cadence ?? null,
    calories: activity.calories != null ? Math.round(activity.calories) : null,
  };
}
