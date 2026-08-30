import 'server-only';
import type { IntervalDetails, IntervalStep } from '@/lib/types';
import { formatDurationAlwaysMMSS } from '@/lib/utils/intervals/format';
import type { IntervalsInterval } from './client';

/** Session type and intervals proposed to the user before saving an imported activity. */
export interface DetectedSessionStructure {
  sessionType: string | null;
  intervalDetails: IntervalDetails | null;
}

/** Watch artifacts: a lap both shorter than 30 s and than 100 m carries no training content. */
const MIN_STEP_S = 30;
const MIN_STEP_M = 100;

const LONG_RUN_S = 4500;
const LONG_RUN_M = 14000;

const REP_DISTANCES_M = [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000, 5000];
const DISTANCE_TOLERANCE = 0.05;

interface Lap {
  kind: IntervalStep['stepType'];
  movingS: number;
  distanceM: number;
  hr: number | null;
}

/**
 * Duration of a lap: the distance between its bounds, which matches the lap the watch closed.
 * `moving_time` is recomputed by intervals.icu on the samples and drifts by a few seconds.
 */
function lapSeconds(interval: IntervalsInterval): number {
  const start = interval.start_time;
  const end = interval.end_time;
  if (start != null && end != null && end > start) return Math.round(end - start);
  return Math.round(interval.moving_time ?? 0);
}

function lapOf(interval: IntervalsInterval): Lap {
  return {
    kind: interval.type === 'RECOVERY' ? 'recovery' : 'effort',
    movingS: lapSeconds(interval),
    distanceM: interval.distance ?? 0,
    hr: interval.average_heartrate != null ? Math.round(interval.average_heartrate) : null,
  };
}

function isUsable(lap: Lap): boolean {
  return lap.movingS >= MIN_STEP_S || lap.distanceM >= MIN_STEP_M;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Rounds a measured duration to the value a human would have written down. */
function roundDuration(seconds: number): number {
  if (seconds < 60) return Math.round(seconds / 5) * 5;
  if (seconds < 180) return Math.round(seconds / 15) * 15;
  if (seconds < 600) return Math.round(seconds / 30) * 30;
  return Math.round(seconds / 60) * 60;
}

function distanceKm(lap: Lap): number | null {
  return lap.distanceM ? Number((lap.distanceM / 1000).toFixed(2)) : null;
}

/** Pace derived from the values the form shows, so opening the step details changes nothing. */
function paceSKm(lap: Lap): number | null {
  const km = distanceKm(lap);
  return km && lap.movingS ? lap.movingS / km : null;
}

function formatPace(seconds: number | null): string | null {
  return seconds ? formatDurationAlwaysMMSS(seconds) : null;
}

/** The distance the athlete aimed at, when every rep lands on the same round value. */
function repDistanceKm(distances: number[]): number | null {
  const target = REP_DISTANCES_M.find((candidate) =>
    distances.every((distance) => Math.abs(distance - candidate) / candidate <= DISTANCE_TOLERANCE)
  );
  return target ? target / 1000 : null;
}

function workoutTypeOf(effortDurations: number[]): string {
  const shortest = Math.min(...effortDurations);
  const longest = Math.max(...effortDurations);
  if (effortDurations.length >= 3 && shortest && longest / shortest > 1.75) return 'FARTLEK';

  const typical = median(effortDurations);
  if (typical <= 180) return 'VMA';
  if (typical <= 480) return 'SEUIL';
  return 'TEMPO';
}

function continuousSessionType(laps: Lap[]): string {
  const movingS = laps.reduce((total, lap) => total + lap.movingS, 0);
  const distanceM = laps.reduce((total, lap) => total + lap.distanceM, 0);
  return movingS >= LONG_RUN_S || distanceM >= LONG_RUN_M ? 'Sortie longue' : 'Footing';
}

function toStep(lap: Lap, index: number): IntervalStep {
  return {
    stepNumber: index + 1,
    stepType: lap.kind,
    duration: lap.movingS ? formatDurationAlwaysMMSS(lap.movingS) : null,
    distance: distanceKm(lap),
    pace: formatPace(paceSKm(lap)),
    hr: lap.hr,
  };
}

/**
 * Maps the laps detected by intervals.icu into the session form: an interval workout when efforts
 * and recoveries alternate, a plain run otherwise. Values stay editable — nothing is imposed.
 */
export function detectSessionStructure(intervals: IntervalsInterval[]): DetectedSessionStructure {
  const laps = intervals.map(lapOf);
  const usable = laps.filter(isUsable);
  const efforts = usable.filter((lap) => lap.kind === 'effort');
  const recoveries = usable.filter((lap) => lap.kind === 'recovery');

  if (!efforts.length || (efforts.length < 2 && !recoveries.length)) {
    return { sessionType: laps.length ? continuousSessionType(laps) : null, intervalDetails: null };
  }

  // A recovery lap opening or closing the session is a warm-up / cool-down, not a rest between reps.
  const steps = usable.map((lap, index) => {
    const isEdge = index === 0 || index === usable.length - 1;
    if (lap.kind !== 'recovery' || !isEdge) return lap;
    return { ...lap, kind: (index === 0 ? 'warmup' : 'cooldown') as IntervalStep['stepType'] };
  });

  const restLaps = steps.filter((lap) => lap.kind === 'recovery');
  const effortDurations = efforts.map((lap) => lap.movingS);
  const effortDistanceKm = repDistanceKm(efforts.map((lap) => lap.distanceM));
  const effortPaces = efforts.map(paceSKm).filter((pace): pace is number => pace !== null);
  const restPaces = restLaps.map(paceSKm).filter((pace): pace is number => pace !== null);
  const effortHrs = efforts.map((lap) => lap.hr).filter((hr): hr is number => hr !== null);

  return {
    sessionType: 'Fractionné',
    intervalDetails: {
      workoutType: workoutTypeOf(effortDurations),
      repetitionCount: efforts.length,
      effortDuration: effortDistanceKm ? null : formatDurationAlwaysMMSS(roundDuration(median(effortDurations))),
      effortDistance: effortDistanceKm,
      recoveryDuration: restLaps.length
        ? formatDurationAlwaysMMSS(roundDuration(median(restLaps.map((lap) => lap.movingS))))
        : null,
      recoveryDistance: null,
      targetEffortPace: effortPaces.length ? formatPace(mean(effortPaces)) : null,
      targetEffortHR: effortHrs.length ? Math.round(mean(effortHrs)) : null,
      targetRecoveryPace: restPaces.length ? formatPace(mean(restPaces)) : null,
      steps: steps.map(toStep),
    },
  };
}
