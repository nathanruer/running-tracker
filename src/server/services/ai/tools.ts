import 'server-only';
import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/server/database';
import { formatDuration } from '@/lib/utils/duration/format';
import { sessionTypeFromStructure } from '@/lib/domain/workouts/structure';
import type { AIResponseValidated } from '@/lib/validation/schemas/ai-response';
import { validateAndFixRecommendations } from './validator';
import type { AthleteForm } from './context/form-context';
import { fetchProfile, fetchSessions, fetchSessionStats, fetchNextSessionNumber } from './data/fetcher';
import { buildProfileContext } from './context/profile-context';
import { buildRecentSessionsContext } from './context/session-context';
import {
  buildWorkoutTypeDistribution,
  buildCompactQualityHistory,
  buildEnduranceStats,
  calculateSessionTypeStats,
} from './context/stats-context';

export interface ProposedRecommendations {
  validated: AIResponseValidated;
}

const proposedSessionSchema = z
  .looseObject({
    sessionNumber: z.number().optional(),
    session_type: z.string().optional(),
    duration_min: z.number(),
    estimated_distance_km: z.number(),
    target_pace_min_km: z.string().optional(),
    target_hr_bpm: z.number().optional(),
    target_rpe: z.number().optional(),
    description: z.string().optional(),
    interval_structure: z.string().nullish(),
    interval_details: z.looseObject({}).nullish(),
  });

export function buildAgentTools(
  userId: string,
  proposed: ProposedRecommendations[],
  form: AthleteForm | null = null
) {
  return {
    get_profile: tool({
      description: "Profil de l'athlète (âge, FC max, VMA, objectif) et prochain numéro de séance.",
      inputSchema: z.object({}),
      execute: async () => {
        const [profile, nextSessionNumber] = await Promise.all([
          fetchProfile(userId),
          fetchNextSessionNumber(userId),
        ]);
        return buildProfileContext(profile, nextSessionNumber);
      },
    }),

    get_stats: tool({
      description:
        "Statistiques d'entraînement: distribution des séances qualité (4 dernières semaines), historique compact des fractionnés, stats endurance, totaux.",
      inputSchema: z.object({}),
      execute: async () => {
        const [sessions, totals] = await Promise.all([
          fetchSessions(userId, 50),
          fetchSessionStats(userId),
        ]);
        return [
          `Historique: ${totals.totalSessions} séances, ${totals.totalDistance.toFixed(1)} km au total`,
          buildWorkoutTypeDistribution(sessions, 4),
          buildCompactQualityHistory(sessions, 5),
          buildEnduranceStats(sessions),
          calculateSessionTypeStats(sessions.slice(0, 20)),
        ]
          .filter(Boolean)
          .join('\n');
      },
    }),

    get_recent_sessions: tool({
      description: 'Le détail des N dernières séances réalisées (date, type, allure, FC, structure, sensations).',
      inputSchema: z.object({
        count: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ count }) => {
        const sessions = await fetchSessions(userId, count);
        if (sessions.length === 0) return 'Aucune séance réalisée pour le moment.';
        return buildRecentSessionsContext(sessions, count);
      },
    }),

    get_planned_sessions: tool({
      description: 'Les séances actuellement planifiées (à venir) avec leurs cibles.',
      inputSchema: z.object({}),
      execute: async () => {
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

        if (plans.length === 0) return 'Aucune séance planifiée pour le moment.';

        return plans
          .map((p) => {
            const date = p.plannedOn ? p.plannedOn.toISOString().slice(0, 10) : 'sans date';
            const targets = [
              p.targetDurationS ? `${Math.round(p.targetDurationS / 60)}min` : null,
              p.targetDistanceM ? `${p.targetDistanceM / 1000}km` : null,
              p.targetPaceSKm ? `${formatDuration(p.targetPaceSKm)}/km` : null,
            ]
              .filter(Boolean)
              .join(', ');
            return `- #${p.sessionNumber ?? '?'} ${date} ${sessionTypeFromStructure(p.family, p.structure) ?? '?'}${targets ? ` (${targets})` : ''}`;
          })
          .join('\n');
      },
    }),

    propose_sessions: tool({
      description:
        "Propose un plan de séances à l'athlète. Les séances apparaissent en cartes ajoutables à son plan — c'est le seul canal valide pour recommander des séances.",
      inputSchema: z.object({
        rationale: z.string().describe('Explication globale du plan proposé.'),
        week_summary: z.string().optional(),
        recommended_sessions: z.array(proposedSessionSchema).min(1).max(7),
      }),
      execute: async (input) => {
        const validated = validateAndFixRecommendations(
          { responseType: 'recommendations', ...input },
          form
        );
        proposed.push({ validated });
        const count =
          validated.responseType === 'recommendations' ? validated.recommended_sessions.length : 0;
        return `${count} séance${count > 1 ? 's' : ''} transmise${count > 1 ? 's' : ''} à l'athlète sous forme de cartes. Conclus en une phrase, sans répéter le détail.`;
      },
    }),
  };
}
