import 'server-only';
import type { Prisma } from '@prisma/client';
import type { IntervalDetails } from '@/lib/types';
import { parseDuration } from '@/lib/utils/duration/parse';
import { civilDayInZone, isDayOnly } from '@/lib/utils/date/zoned';
import {
  STRUCTURE_SCHEMA_VERSION,
  deriveStructureTargets,
  intervalDetailsToStructure,
  planStructureForCompleted,
} from '@/lib/domain/workouts/structure';

export interface PlannedInput {
  sessionType: string | null;
  intervalDetails: IntervalDetails | null;
  plannedDate: unknown;
  /** Minutes, as sent by the legacy API. */
  targetDuration: number | null;
  /** Kilometres, as sent by the legacy API. */
  targetDistance: number | null;
  targetPace: string | null;
  targetHeartRateBpm: string | number | null;
  targetRPE: number | null;
  recommendationId: string | null;
  comments: string;
}

/** Civil day of a planned session as a UTC-midnight Date (Prisma `@db.Date`). */
export function toPlannedOn(value: unknown, timezone: string): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return new Date(`${civilDayInZone(value, timezone)}T00:00:00Z`);

  const raw = String(value).trim();
  if (isDayOnly(raw)) return new Date(`${raw}T00:00:00Z`);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(`${civilDayInZone(parsed, timezone)}T00:00:00Z`);
}

function roundedOrNull(value: unknown, factor: number): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * factor) : null;
}

export function buildPlannedWorkoutFields(input: PlannedInput, timezone: string, options: { completed: boolean }) {
  const targetDurationS = roundedOrNull(input.targetDuration, 60);
  const targetDistanceM = roundedOrNull(input.targetDistance, 1000);
  const targetPaceSKm = parseDuration(input.targetPace);
  const targetHrBpm = roundedOrNull(input.targetHeartRateBpm, 1);
  const targets = { durationS: targetDurationS, distanceM: targetDistanceM, paceSKm: targetPaceSKm, hrBpm: targetHrBpm };
  const structure = options.completed
    ? planStructureForCompleted(input.intervalDetails, input.sessionType, targets)
    : intervalDetailsToStructure(input.intervalDetails, input.sessionType, targets);
  const derived = deriveStructureTargets(structure.blocks);

  return {
    plannedOn: toPlannedOn(input.plannedDate, timezone),
    timezone,
    family: structure.family,
    structure: structure as unknown as Prisma.InputJsonValue,
    schemaVersion: STRUCTURE_SCHEMA_VERSION,
    targetDurationS: targetDurationS ?? (derived.durationS || null),
    targetDistanceM: targetDistanceM ?? (derived.distanceM || null),
    targetPaceSKm,
    targetHrBpm,
    targetRpe: input.targetRPE ?? null,
    origin: input.recommendationId ? ('coach' as const) : ('manual' as const),
    recommendationId: input.recommendationId,
    notes: input.comments,
  };
}
