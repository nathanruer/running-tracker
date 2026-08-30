// Lot 6 check — rebuilds each planned_workouts.structure from structure_legacy with the app converter and derives v1 details back. Usage: DATABASE_URL=... npx tsx scripts/db-v3/check-planned-roundtrip.ts
import { PrismaClient } from '@prisma/client';
import { familyLabel, intervalDetailsToStructure, structureToIntervalDetails, type WorkoutFamily } from '@/lib/domain/workouts/structure';
import type { IntervalDetails, IntervalStep } from '@/lib/types';
import { parseDuration } from '@/lib/utils/duration/parse';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.planned_workouts.findMany({
    select: { id: true, family: true, structure: true, structureLegacy: true, targetDurationS: true, targetDistanceM: true, targetPaceSKm: true, targetHrBpm: true },
    orderBy: { createdAt: 'asc' },
  });
  // jsonb does not preserve key order: compare canonical forms.
  const canonical = (value: unknown): string => JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v);
  const dur = (v: unknown) => (typeof v === 'string' ? parseDuration(v) : null);
  const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
  let structureMismatch = 0; let detailMismatch = 0;
  for (const r of rows) {
    const legacy = r.structureLegacy as unknown as IntervalDetails | null;
    const label = familyLabel(r.family as WorkoutFamily | null);
    const rebuilt = intervalDetailsToStructure(legacy, label, { durationS: r.targetDurationS, distanceM: r.targetDistanceM, paceSKm: r.targetPaceSKm, hrBpm: r.targetHrBpm });
    const sameStructure = canonical(rebuilt) === canonical(r.structure);
    if (!sameStructure) { structureMismatch++; console.log(`STRUCTURE DIFF ${r.id}\n  stored : ${canonical(r.structure)}\n  rebuilt: ${canonical(rebuilt)}`); }
    const derived = structureToIntervalDetails(r.structure);
    const diffs: string[] = [];
    if (legacy) {
      if (!derived) diffs.push('derived null');
      else {
        const cmp = (name: string, a: unknown, b: unknown) => { if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) diffs.push(`${name}: legacy=${JSON.stringify(a ?? null)} derived=${JSON.stringify(b ?? null)}`); };
        cmp('workoutType', legacy.workoutType, derived.workoutType);
        cmp('repetitionCount', num(legacy.repetitionCount), derived.repetitionCount);
        cmp('effortDuration', dur(legacy.effortDuration), dur(derived.effortDuration));
        cmp('recoveryDuration', dur(legacy.recoveryDuration), dur(derived.recoveryDuration));
        cmp('effortDistance', num(legacy.effortDistance), derived.effortDistance);
        cmp('recoveryDistance', num(legacy.recoveryDistance), derived.recoveryDistance);
        cmp('targetEffortPace', dur(legacy.targetEffortPace), dur(derived.targetEffortPace));
        cmp('targetEffortHR', num(legacy.targetEffortHR), derived.targetEffortHR);
        cmp('targetRecoveryPace', dur(legacy.targetRecoveryPace), dur(derived.targetRecoveryPace));
        cmp('steps.length', legacy.steps?.length ?? 0, derived.steps.length);
        (legacy.steps ?? []).forEach((s: IntervalStep, i: number) => {
          const d = derived.steps[i]; if (!d) return;
          cmp(`step${i + 1}.type`, s.stepType, d.stepType);
          cmp(`step${i + 1}.duration`, dur(s.duration), dur(d.duration));
          cmp(`step${i + 1}.distance`, num(s.distance), d.distance);
          cmp(`step${i + 1}.pace`, dur(s.pace), dur(d.pace));
          cmp(`step${i + 1}.hr`, num(s.hr), d.hr);
        });
      }
    } else if (derived) diffs.push('derived not null for continuous');
    if (diffs.length) { detailMismatch++; console.log(`DETAILS DIFF ${r.id} (${r.family}): ${diffs.length} field(s) — ${diffs.filter((d) => !d.startsWith('step')).join(' | ') || 'steps only'}`); }
  }
  console.log(`rows=${rows.length} structureMismatch=${structureMismatch} detailMismatch=${detailMismatch}`);
}

main().finally(() => prisma.$disconnect());
