import 'server-only';
import { prisma } from '@/server/database';
import { formatDuration } from '@/lib/utils/duration/format';
import { sessionTypeFromStructure } from '@/lib/domain/workouts/structure';

/** The sessions already on the athlete's plan, so the coach never proposes them twice. */
export async function buildPlannedContext(userId: string): Promise<string> {
  const plans = await prisma.planned_workouts.findMany({
    where: { userId, status: 'planned', workoutId: null },
    orderBy: [{ plannedOn: 'asc' }, { createdAt: 'asc' }],
    take: 20,
    select: {
      sessionNumber: true,
      plannedOn: true,
      family: true,
      structure: true,
      targetDurationS: true,
      targetDistanceM: true,
      targetPaceSKm: true,
    },
  });

  if (plans.length === 0) return 'Séances déjà planifiées : aucune.';

  const lines = plans.map((plan) => {
    const date = plan.plannedOn ? plan.plannedOn.toISOString().slice(0, 10) : 'sans date';
    const targets = [
      plan.targetDurationS ? `${Math.round(plan.targetDurationS / 60)}min` : null,
      plan.targetDistanceM ? `${plan.targetDistanceM / 1000}km` : null,
      plan.targetPaceSKm ? `${formatDuration(plan.targetPaceSKm)}/km` : null,
    ]
      .filter(Boolean)
      .join(', ');
    const type = sessionTypeFromStructure(plan.family, plan.structure) ?? '?';
    return `- #${plan.sessionNumber ?? '?'} ${date} ${type}${targets ? ` (${targets})` : ''}`;
  });

  return ['Séances déjà planifiées :', ...lines].join('\n');
}
