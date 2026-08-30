import 'server-only';
import type { IntervalDetails } from '@/lib/types';
import { formatDuration } from '@/lib/utils/duration';
import type { IntervalsActivity, IntervalsInterval, IntervalsStream } from './client';
import { detectSessionStructure } from './detection';
import { buildPolylineFromLatLngs, mapStreams, INTERVALS_SOURCE } from './mapper';

/** One recording to fold into the merged session. */
export interface MergePart {
  activity: IntervalsActivity;
  streams: IntervalsStream[];
  latlngs: unknown[];
  intervals: IntervalsInterval[];
}

export interface MergedSource {
  externalId: string;
  startedAt: string | null;
  sourcePayload: unknown;
}

export interface MergedActivity {
  date: string;
  startedAt: string | null;
  sessionType: string | null;
  duration: string;
  distance: number;
  avgPace: string;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  perceivedExertion: null;
  comments: string;
  externalId: string;
  source: string;
  routePolyline: string | null;
  streams: Record<string, { data: number[] }> | null;
  sourcePayload: unknown;
  sources: MergedSource[];
  elevationGain: number | null;
  averageCadence: number | null;
  calories: number | null;
  intervalDetails: IntervalDetails | null;
  alreadyImported: false;
}

function startTime(activity: IntervalsActivity): number {
  return new Date(activity.start_date ?? activity.start_date_local).getTime();
}

function movingSeconds(activity: IntervalsActivity): number {
  return activity.moving_time ?? activity.elapsed_time ?? 0;
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

/** Average weighted by moving time: a 7-minute warm-up must not weigh as much as a 22-minute effort. */
function weightedAverage(parts: MergePart[], value: (activity: IntervalsActivity) => number | null | undefined) {
  const weighted = parts.filter((part) => value(part.activity) != null);
  const total = sum(weighted.map((part) => movingSeconds(part.activity)));
  if (!total) return null;
  return sum(weighted.map((part) => (value(part.activity) ?? 0) * movingSeconds(part.activity))) / total;
}

/**
 * Laps handed to the detection: a piece without its own intervals becomes a single easy lap, which
 * reads as the warm-up (or cool-down) of the merged session.
 */
function lapsOf(part: MergePart): IntervalsInterval[] {
  if (detectSessionStructure(part.intervals).intervalDetails) return part.intervals;

  return [{
    type: 'RECOVERY',
    moving_time: movingSeconds(part.activity),
    distance: part.activity.distance ?? 0,
    average_heartrate: part.activity.average_heartrate ?? null,
  }];
}

/** Series glued end to end: time and distance continue where the previous recording stopped. */
export function mergeStreamSets(
  sets: Array<Record<string, { data: number[] }> | null>
): Record<string, { data: number[] }> | null {
  const present = sets.filter((set): set is Record<string, { data: number[] }> => set !== null);
  return mergeSets(present);
}

function mergeStreams(parts: MergePart[]): Record<string, { data: number[] }> | null {
  return mergeStreamSets(parts.map((part) => mapStreams(part.streams)));
}

function mergeSets(sets: Array<Record<string, { data: number[] }>>): Record<string, { data: number[] }> | null {
  if (!sets.length) return null;

  const types = Object.keys(sets[0]).filter((type) => sets.every((set) => type in set));
  const merged: Record<string, { data: number[] }> = {};
  let timeOffset = 0;
  let distanceOffset = 0;

  for (const set of sets) {
    for (const type of types) {
      const offset = type === 'time' ? timeOffset : type === 'distance' ? distanceOffset : 0;
      const data = offset ? set[type].data.map((value) => value + offset) : set[type].data;
      merged[type] = { data: [...(merged[type]?.data ?? []), ...data] };
    }
    timeOffset += (set.time?.data.at(-1) ?? 0) + 1;
    distanceOffset += set.distance?.data.at(-1) ?? 0;
  }

  return Object.keys(merged).length ? merged : null;
}

/** Builds the single session the athlete actually ran out of the pieces the watch recorded. */
export function mergeIntervalsActivities(parts: MergePart[]): MergedActivity {
  const ordered = [...parts].sort((a, b) => startTime(a.activity) - startTime(b.activity));
  const first = ordered[0].activity;
  const main = ordered.reduce((longest, part) =>
    movingSeconds(part.activity) > movingSeconds(longest.activity) ? part : longest
  ).activity;

  const durationS = sum(ordered.map((part) => movingSeconds(part.activity)));
  const distanceM = sum(ordered.map((part) => part.activity.distance));
  const distanceKm = distanceM / 1000;
  const avgHr = weightedAverage(ordered, (activity) => activity.average_heartrate);
  const cadence = weightedAverage(ordered, (activity) => activity.average_cadence);
  const maxHrs = ordered.map((part) => part.activity.max_heartrate).filter((hr): hr is number => hr != null);
  const detected = detectSessionStructure(ordered.flatMap(lapsOf));

  return {
    date: first.start_date_local,
    startedAt: first.start_date ?? null,
    sessionType: detected.sessionType,
    duration: formatDuration(durationS),
    distance: Math.round(distanceKm * 100) / 100,
    avgPace: distanceKm > 0 ? formatDuration(Math.round(durationS / distanceKm)) : '00:00',
    avgHeartRate: avgHr != null ? Math.round(avgHr) : null,
    maxHeartRate: maxHrs.length ? Math.max(...maxHrs) : null,
    perceivedExertion: null,
    comments: main.name ?? '',
    externalId: main.id,
    source: INTERVALS_SOURCE,
    routePolyline: buildPolylineFromLatLngs(ordered.flatMap((part) => part.latlngs)),
    streams: mergeStreams(ordered),
    sourcePayload: main,
    sources: ordered.map((part) => ({
      externalId: part.activity.id,
      startedAt: part.activity.start_date ?? null,
      sourcePayload: part.activity,
    })),
    elevationGain: sum(ordered.map((part) => part.activity.total_elevation_gain)) || null,
    averageCadence: cadence,
    calories: Math.round(sum(ordered.map((part) => part.activity.calories))) || null,
    intervalDetails: detected.intervalDetails,
    alreadyImported: false,
  };
}
