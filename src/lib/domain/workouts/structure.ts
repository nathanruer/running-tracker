import type { IntervalDetails, IntervalStep } from '@/lib/types';
import { parseDuration } from '@/lib/utils/duration/parse';
import { formatDurationAlwaysMMSS } from '@/lib/utils/intervals/format';
import { isFractionneType } from '@/lib/utils/session-type';

export const STRUCTURE_SCHEMA_VERSION = 3;

export const WORKOUT_FAMILIES = [
  'footing', 'long', 'fartlek', 'vma_short', 'vma_long', 'threshold', 'tempo',
  'specific', 'hills', 'recovery', 'race', 'other',
] as const;
export type WorkoutFamily = (typeof WORKOUT_FAMILIES)[number];

export type BlockType = 'warmup' | 'work' | 'recovery' | 'cooldown' | 'other';

export interface BlockTarget {
  duration_s?: number;
  distance_m?: number;
}

export interface BlockIntensity {
  pace_s_km?: number;
  hr_bpm?: number;
  zone?: string;
}

export interface WorkoutBlock {
  type: BlockType;
  target: BlockTarget;
  intensity?: BlockIntensity;
}

export interface RepeatBlock {
  type: 'repeat';
  times: number;
  blocks: WorkoutBlock[];
}

export type StructureBlock = WorkoutBlock | RepeatBlock;

export interface WorkoutStructure {
  kind: 'interval' | 'continuous';
  family: WorkoutFamily | null;
  blocks: StructureBlock[];
  /** Free session label kept only when it cannot be derived from the family. */
  label?: string;
}

export interface StructureTargets {
  durationS: number | null;
  distanceM: number | null;
  paceSKm?: number | null;
  hrBpm?: number | null;
}

/** An executed interval (workout_intervals row) used to rebuild legacy steps. */
export interface IntervalActual {
  position: number;
  kind: BlockType;
  movingS: number | null;
  distanceM: number | null;
  paceSKm: number | null;
  avgHr: number | null;
}

const FAMILY_LABELS: Record<WorkoutFamily, string | null> = {
  footing: 'Footing',
  recovery: 'Footing',
  long: 'Sortie longue',
  race: 'Course',
  fartlek: 'Fractionné',
  vma_short: 'Fractionné',
  vma_long: 'Fractionné',
  threshold: 'Fractionné',
  tempo: 'Fractionné',
  specific: 'Fractionné',
  hills: 'Fractionné',
  other: null,
};

const FAMILY_WORKOUT_TYPES: Partial<Record<WorkoutFamily, string>> = {
  vma_short: 'VMA',
  vma_long: 'VMA',
  threshold: 'SEUIL',
  tempo: 'TEMPO',
  specific: 'SPÉCIFIQUE',
  fartlek: 'FARTLEK',
  hills: 'CÔTES',
};

const STEP_TO_BLOCK: Record<IntervalStep['stepType'], BlockType> = {
  warmup: 'warmup',
  effort: 'work',
  recovery: 'recovery',
  cooldown: 'cooldown',
};

const BLOCK_TO_STEP: Record<BlockType, IntervalStep['stepType']> = {
  warmup: 'warmup',
  work: 'effort',
  recovery: 'recovery',
  cooldown: 'cooldown',
  other: 'effort',
};

export function isRepeatBlock(block: StructureBlock): block is RepeatBlock {
  return block.type === 'repeat';
}

export function isWorkoutStructure(value: unknown): value is WorkoutStructure {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (record.kind === 'interval' || record.kind === 'continuous') && Array.isArray(record.blocks);
}

export function familyLabel(family: WorkoutFamily | null): string | null {
  return family ? FAMILY_LABELS[family] : null;
}

/** SQL expression giving the legacy session type label of a planned_workouts row aliased `p`. */
export function familyLabelSql(alias = 'p'): string {
  const cases = WORKOUT_FAMILIES
    .filter((family) => FAMILY_LABELS[family] !== null)
    .map((family) => `WHEN '${family}' THEN '${FAMILY_LABELS[family]}'`)
    .join(' ');
  return `COALESCE(${alias}.structure->>'label', CASE ${alias}.family::text ${cases} ELSE NULL END)`;
}

export function sessionTypeFromStructure(family: WorkoutFamily | null, structure: unknown): string | null {
  const label = isWorkoutStructure(structure) ? structure.label : undefined;
  return label ?? familyLabel(family);
}

function effortMeasure(details: IntervalDetails | null): { distanceM: number; durationS: number } {
  const quickKm = Number(details?.effortDistance) || 0;
  const quickS = parseDuration(details?.effortDuration) ?? 0;
  if (quickKm || quickS) return { distanceM: quickKm * 1000, durationS: quickS };

  const firstEffort = details?.steps?.find((step) => step.stepType === 'effort');
  return {
    distanceM: (Number(firstEffort?.distance) || 0) * 1000,
    durationS: parseDuration(firstEffort?.duration) ?? 0,
  };
}

export function familyFromSession(
  sessionType: string | null | undefined,
  details: IntervalDetails | null
): WorkoutFamily | null {
  if (!sessionType) return null;
  const normalized = sessionType.trim().toLowerCase();
  if (normalized === 'footing') return 'footing';
  if (normalized === 'sortie longue') return 'long';
  if (normalized === 'course') return 'race';
  if (!isFractionneType(sessionType)) return 'other';

  const workoutType = (details?.workoutType ?? '').trim().toUpperCase();
  if (workoutType === 'SEUIL') return 'threshold';
  if (workoutType === 'TEMPO') return 'tempo';
  if (workoutType === 'SPÉCIFIQUE' || workoutType === 'SPECIFIQUE') return 'specific';
  if (workoutType === 'FARTLEK') return 'fartlek';
  if (workoutType === 'CÔTES' || workoutType === 'COTES') return 'hills';
  if (workoutType === 'VMA') {
    const { distanceM, durationS } = effortMeasure(details);
    return distanceM >= 600 || durationS >= 150 ? 'vma_long' : 'vma_short';
  }
  return 'other';
}

function intensityOf(pace: string | null | undefined, hr: number | null | undefined): BlockIntensity | undefined {
  const intensity: BlockIntensity = {};
  const paceS = parseDuration(pace);
  if (paceS) intensity.pace_s_km = paceS;
  if (typeof hr === 'number') intensity.hr_bpm = hr;
  return Object.keys(intensity).length ? intensity : undefined;
}

function block(type: BlockType, target: BlockTarget, intensity?: BlockIntensity): WorkoutBlock {
  return intensity ? { type, target, intensity } : { type, target };
}

function stepToBlock(step: IntervalStep): WorkoutBlock {
  const type = STEP_TO_BLOCK[step.stepType] ?? 'other';
  const durationS = parseDuration(step.duration);
  const paceS = parseDuration(step.pace);
  const distanceKm = typeof step.distance === 'number' ? step.distance : null;

  let target: BlockTarget;
  if (type === 'work' && distanceKm && paceS && durationS) {
    const computedKm = durationS / paceS;
    target = Math.abs(distanceKm - computedKm) / distanceKm > 0.05
      ? { distance_m: Math.round(distanceKm * 1000) }
      : { duration_s: durationS };
  } else if (durationS) {
    target = { duration_s: durationS };
  } else if (distanceKm) {
    target = { distance_m: Math.round(distanceKm * 1000) };
  } else {
    target = { duration_s: 0 };
  }

  return block(type, target, intensityOf(step.pace, step.hr));
}

function sameBlock(a: WorkoutBlock, b: WorkoutBlock): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function groupRepeats(blocks: WorkoutBlock[]): StructureBlock[] {
  const out: StructureBlock[] = [];
  let i = 0;
  while (i < blocks.length) {
    const current = blocks[i];
    const next = blocks[i + 1];
    if (current.type === 'work' && next?.type === 'recovery') {
      let times = 1;
      let j = i + 2;
      while (
        blocks[j]?.type === 'work'
        && blocks[j + 1]?.type === 'recovery'
        && sameBlock(blocks[j], current)
        && sameBlock(blocks[j + 1], next)
      ) {
        times++;
        j += 2;
      }
      if (times >= 2) {
        out.push({ type: 'repeat', times, blocks: [current, next] });
        i = j;
        continue;
      }
    }
    out.push(current);
    i++;
  }
  return out;
}

function quickBlocks(details: IntervalDetails): StructureBlock[] {
  const times = details.repetitionCount ?? 0;
  const effortDistanceKm = Number(details.effortDistance) || 0;
  const effortDurationS = parseDuration(details.effortDuration);
  if (times < 1 || (!effortDistanceKm && !effortDurationS)) return [];

  const work = block(
    'work',
    effortDistanceKm ? { distance_m: Math.round(effortDistanceKm * 1000) } : { duration_s: effortDurationS ?? 0 },
    intensityOf(details.targetEffortPace, details.targetEffortHR)
  );
  const recoveryDistanceKm = Number(details.recoveryDistance) || 0;
  const recoveryDurationS = parseDuration(details.recoveryDuration);
  const recovery = recoveryDistanceKm || recoveryDurationS
    ? block(
        'recovery',
        recoveryDistanceKm ? { distance_m: Math.round(recoveryDistanceKm * 1000) } : { duration_s: recoveryDurationS ?? 0 },
        intensityOf(details.targetRecoveryPace, null)
      )
    : null;

  const pair = recovery ? [work, recovery] : [work];
  if (times === 1) return pair;
  return [{ type: 'repeat', times, blocks: pair }];
}

export function intervalDetailsToStructure(
  details: IntervalDetails | null,
  sessionType: string | null | undefined,
  targets: StructureTargets
): WorkoutStructure {
  const family = familyFromSession(sessionType, details);
  const label = sessionType && sessionType !== familyLabel(family) ? sessionType : undefined;

  let structure: WorkoutStructure;
  if (details?.steps?.length) {
    structure = { kind: 'interval', family, blocks: groupRepeats(details.steps.map(stepToBlock)) };
  } else if (details) {
    structure = { kind: 'interval', family, blocks: quickBlocks(details) };
  } else {
    const target: BlockTarget = targets.durationS
      ? { duration_s: targets.durationS }
      : targets.distanceM
        ? { distance_m: targets.distanceM }
        : { duration_s: 0 };
    const intensity: BlockIntensity = {};
    if (targets.paceSKm) intensity.pace_s_km = targets.paceSKm;
    if (targets.hrBpm) intensity.hr_bpm = targets.hrBpm;
    structure = { kind: 'continuous', family, blocks: [block('work', target, Object.keys(intensity).length ? intensity : undefined)] };
  }

  return label ? { ...structure, label } : structure;
}

export function flattenBlocks(blocks: StructureBlock[]): WorkoutBlock[] {
  const out: WorkoutBlock[] = [];
  for (const item of blocks) {
    if (isRepeatBlock(item)) {
      for (let n = 0; n < item.times; n++) out.push(...item.blocks);
    } else {
      out.push(item);
    }
  }
  return out;
}

export function deriveStructureTargets(blocks: StructureBlock[]): { durationS: number; distanceM: number } {
  let durationS = 0;
  let distanceM = 0;
  for (const item of flattenBlocks(blocks)) {
    const pace = item.intensity?.pace_s_km;
    if (item.target.duration_s != null) {
      durationS += item.target.duration_s;
      if (pace) distanceM += (item.target.duration_s / pace) * 1000;
    } else if (item.target.distance_m != null) {
      distanceM += item.target.distance_m;
      if (pace) durationS += (item.target.distance_m / 1000) * pace;
    }
  }
  return { durationS: Math.round(durationS), distanceM: Math.round(distanceM) };
}

const durationLabel = (seconds: number | undefined): string | null =>
  seconds != null ? formatDurationAlwaysMMSS(seconds) : null;
const distanceKm = (meters: number | undefined): number | null => (meters != null ? meters / 1000 : null);

function blockToStep(item: WorkoutBlock, stepNumber: number): IntervalStep {
  return {
    stepNumber,
    stepType: BLOCK_TO_STEP[item.type] ?? 'effort',
    duration: durationLabel(item.target.duration_s),
    distance: distanceKm(item.target.distance_m),
    pace: durationLabel(item.intensity?.pace_s_km),
    hr: item.intensity?.hr_bpm ?? null,
  };
}

export function hasQuickFields(details: IntervalDetails | null | undefined): boolean {
  return Boolean(details && (details.repetitionCount || details.effortDuration || details.effortDistance));
}

/**
 * Plan structure of a completed session: the quick fields describe what was planned,
 * the steps describe what was done (stored as actual intervals).
 */
export function planStructureForCompleted(
  details: IntervalDetails | null,
  sessionType: string | null | undefined,
  targets: StructureTargets
): WorkoutStructure {
  return intervalDetailsToStructure(hasQuickFields(details) ? { ...details!, steps: [] } : details, sessionType, targets);
}

export function actualsFromSteps(steps: IntervalStep[] | null | undefined): IntervalActual[] {
  return (steps ?? []).map((step, index) => ({
    position: index + 1,
    kind: STEP_TO_BLOCK[step.stepType] ?? 'other',
    movingS: parseDuration(step.duration),
    distanceM: typeof step.distance === 'number' ? Math.round(step.distance * 1000) : null,
    paceSKm: parseDuration(step.pace),
    avgHr: typeof step.hr === 'number' ? step.hr : null,
  }));
}

function actualToStep(actual: IntervalActual, stepNumber: number): IntervalStep {
  return {
    stepNumber,
    stepType: BLOCK_TO_STEP[actual.kind] ?? 'effort',
    duration: actual.movingS != null ? formatDurationAlwaysMMSS(actual.movingS) : null,
    distance: distanceKm(actual.distanceM ?? undefined),
    pace: actual.paceSKm != null ? formatDurationAlwaysMMSS(actual.paceSKm) : null,
    hr: actual.avgHr,
  };
}

/** Legacy details view: targets from the plan structure, steps from the executed intervals when present. */
export function intervalDetailsFromV3(structure: unknown, actuals: IntervalActual[] = []): IntervalDetails | null {
  const base = structureToIntervalDetails(structure);
  if (!actuals.length) return base;

  const steps = [...actuals]
    .sort((a, b) => a.position - b.position)
    .map((actual, index) => actualToStep(actual, index + 1));
  const family = isWorkoutStructure(structure) ? structure.family : null;
  return {
    workoutType: family ? FAMILY_WORKOUT_TYPES[family] ?? null : null,
    repetitionCount: null,
    effortDuration: null,
    recoveryDuration: null,
    effortDistance: null,
    recoveryDistance: null,
    targetEffortPace: null,
    targetEffortHR: null,
    targetRecoveryPace: null,
    ...base,
    steps,
  };
}

export function structureToIntervalDetails(structure: unknown): IntervalDetails | null {
  if (!isWorkoutStructure(structure) || structure.kind !== 'interval') return null;

  const flat = flattenBlocks(structure.blocks);
  const repeat = structure.blocks.find(isRepeatBlock);
  const workBlocks = flat.filter((item) => item.type === 'work');
  const work = repeat?.blocks.find((item) => item.type === 'work') ?? workBlocks[0] ?? null;
  const recovery = repeat?.blocks.find((item) => item.type === 'recovery')
    ?? flat.find((item) => item.type === 'recovery')
    ?? null;
  const repetitionCount = repeat ? repeat.times : workBlocks.length || null;

  return {
    workoutType: structure.family ? FAMILY_WORKOUT_TYPES[structure.family] ?? null : null,
    repetitionCount,
    effortDuration: durationLabel(work?.target.duration_s),
    recoveryDuration: durationLabel(recovery?.target.duration_s),
    effortDistance: distanceKm(work?.target.distance_m),
    recoveryDistance: distanceKm(recovery?.target.distance_m),
    targetEffortPace: durationLabel(work?.intensity?.pace_s_km),
    targetEffortHR: work?.intensity?.hr_bpm ?? null,
    targetRecoveryPace: durationLabel(recovery?.intensity?.pace_s_km),
    steps: flat.map((item, index) => blockToStep(item, index + 1)),
  };
}
