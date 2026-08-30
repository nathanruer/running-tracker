// Lot 14 — completed sessions converted from v1: the plan structure is rebuilt from the
// quick fields (what was planned) and the legacy steps become executed intervals.
// Dry-run by default. Usage: DATABASE_URL=... npx tsx scripts/db-v3/lot14-intervals-from-legacy.ts [--apply]
import { PrismaClient, Prisma } from '@prisma/client';
import type { IntervalDetails } from '@/lib/types';
import {
  actualsFromSteps,
  familyLabel,
  flattenBlocks,
  hasQuickFields,
  planStructureForCompleted,
  type WorkoutFamily,
} from '@/lib/domain/workouts/structure';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const rows = await prisma.planned_workouts.findMany({
    where: { structureLegacy: { not: Prisma.DbNull }, workoutId: { not: null }, status: 'completed' },
    select: {
      id: true, workoutId: true, family: true, structure: true, structureLegacy: true,
      targetDurationS: true, targetDistanceM: true, targetPaceSKm: true, targetHrBpm: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`${apply ? 'APPLY' : 'DRY-RUN'} — completed rows with legacy details: ${rows.length}`);

  let intervalsTotal = 0;
  for (const row of rows) {
    const legacy = row.structureLegacy as unknown as IntervalDetails;
    const label = familyLabel(row.family as WorkoutFamily | null);
    const structure = planStructureForCompleted(legacy, label, {
      durationS: row.targetDurationS, distanceM: row.targetDistanceM, paceSKm: row.targetPaceSKm, hrBpm: row.targetHrBpm,
    });
    const actuals = actualsFromSteps(legacy.steps);
    intervalsTotal += actuals.length;
    const before = flattenBlocks((row.structure as { blocks: [] }).blocks).length;
    console.log(
      `${row.id.slice(-6)} ${String(row.family).padEnd(9)} quick=${hasQuickFields(legacy) ? 'yes' : 'no '} ` +
      `plan blocks ${before} → ${flattenBlocks(structure.blocks).length} (reps ${legacy.repetitionCount ?? '-'}) | intervals ${actuals.length}`
    );

    if (!apply) continue;
    await prisma.$transaction([
      prisma.planned_workouts.update({
        where: { id: row.id },
        data: { structure: structure as unknown as Prisma.InputJsonValue, family: structure.family },
      }),
      prisma.workout_intervals.deleteMany({ where: { workoutId: row.workoutId!, source: 'manual' } }),
      prisma.workout_intervals.createMany({
        data: actuals.map((actual) => ({ workoutId: row.workoutId!, ...actual, source: 'manual' as const })),
      }),
    ]);
  }
  console.log(`intervals to write: ${intervalsTotal}${apply ? ' (written)' : ''}`);
}

main().finally(() => prisma.$disconnect());
