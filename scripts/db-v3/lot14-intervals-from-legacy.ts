// Lot 14 — completed sessions converted from v1: the plan structure is rebuilt from the
// quick fields (what was planned) and the legacy steps become executed intervals.
// Raw SQL on purpose: runs against the pre-contract schema (structure_legacy still present).
// Dry-run by default. Usage: DATABASE_URL=... npx tsx scripts/db-v3/lot14-intervals-from-legacy.ts [--apply]
import { PrismaClient } from '@prisma/client';
import type { IntervalDetails } from '@/lib/types';
import {
  actualsFromSteps,
  familyLabel,
  flattenBlocks,
  hasQuickFields,
  planStructureForCompleted,
  type WorkoutFamily,
  type WorkoutStructure,
} from '@/lib/domain/workouts/structure';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

interface Row {
  id: string;
  workout_id: string;
  family: WorkoutFamily | null;
  structure: WorkoutStructure;
  structure_legacy: IntervalDetails;
  target_duration_s: number | null;
  target_distance_m: number | null;
  target_pace_s_km: number | null;
  target_hr_bpm: number | null;
}

async function main() {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT id, workout_id, family::text AS family, structure, structure_legacy, target_duration_s, target_distance_m, target_pace_s_km, target_hr_bpm
     FROM planned_workouts
     WHERE structure_legacy IS NOT NULL AND workout_id IS NOT NULL AND status = 'completed'
     ORDER BY created_at`
  );
  console.log(`${apply ? 'APPLY' : 'DRY-RUN'} — completed rows with legacy details: ${rows.length}`);

  let intervalsTotal = 0;
  for (const row of rows) {
    const legacy = row.structure_legacy;
    const structure = planStructureForCompleted(legacy, familyLabel(row.family), {
      durationS: row.target_duration_s, distanceM: row.target_distance_m, paceSKm: row.target_pace_s_km, hrBpm: row.target_hr_bpm,
    });
    const actuals = actualsFromSteps(legacy.steps);
    intervalsTotal += actuals.length;
    console.log(
      `${row.id.slice(-6)} ${String(row.family).padEnd(9)} quick=${hasQuickFields(legacy) ? 'yes' : 'no '} ` +
      `plan blocks ${flattenBlocks(row.structure.blocks).length} → ${flattenBlocks(structure.blocks).length} (reps ${legacy.repetitionCount ?? '-'}) | intervals ${actuals.length}`
    );

    if (!apply) continue;
    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `UPDATE planned_workouts SET structure = $1::jsonb, family = $2::workout_family, updated_at = now() WHERE id = $3`,
        JSON.stringify(structure), structure.family, row.id
      ),
      prisma.$executeRawUnsafe(`DELETE FROM workout_intervals WHERE workout_id = $1 AND source = 'manual'`, row.workout_id),
      ...actuals.map((actual) =>
        prisma.$executeRawUnsafe(
          `INSERT INTO workout_intervals (workout_id, position, kind, moving_s, distance_m, pace_s_km, avg_hr, source)
           VALUES ($1, $2, $3::interval_kind, $4, $5, $6, $7, 'manual')`,
          row.workout_id, actual.position, actual.kind, actual.movingS, actual.distanceM, actual.paceSKm, actual.avgHr
        )
      ),
    ]);
  }
  console.log(`intervals to write: ${intervalsTotal}${apply ? ' (written)' : ''}`);
}

main().finally(() => prisma.$disconnect());
