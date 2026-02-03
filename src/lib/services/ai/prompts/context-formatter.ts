import type { Intent } from '../intent/types';
import type { FetchedContext } from '../data/fetcher';
import { buildProfileContext } from '../context/profile-context';
import { buildCurrentWeekContext, buildRecentSessionsContext } from '../context/session-context';
import {
  calculateSessionTypeStats,
  buildWorkoutTypeDistribution,
  buildCompactQualityHistory,
  buildEnduranceStats,
} from '../context/stats-context';

export function formatContextForIntent(context: FetchedContext, intent: Intent): string | null {
  if (!context.profile) {
    return null;
  }

  const parts: string[] = ['=== CONTEXTE UTILISATEUR ===\n'];

  parts.push(buildProfileContext(context.profile, context.nextSessionNumber));

  if (intent === 'recommendation_request' && context.currentWeekSessions) {
    parts.push(buildCurrentWeekContext(context.currentWeekSessions));
  }

  if (intent === 'recommendation_request' && context.sessions) {
    parts.push(buildWorkoutTypeDistribution(context.sessions, 4));
    parts.push(buildCompactQualityHistory(context.sessions, 5));
    parts.push(buildEnduranceStats(context.sessions));
    if (context.sessions.length > 0) {
      parts.push(buildRecentSessionsContext(context.sessions, 2));
    }
  }

  if (intent === 'data_analysis' && context.sessions) {
    if (context.totalSessions !== undefined) {
      parts.push(
        `\nHistorique: ${context.totalSessions} seances, ${context.totalDistance?.toFixed(1) ?? 0} km total\n`
      );
    }
    parts.push('\n' + calculateSessionTypeStats(context.sessions));
    if (context.sessions.length > 0) {
      parts.push(buildRecentSessionsContext(context.sessions, 5));
    }
  }

  if (intent === 'advice' && context.sessions) {
    parts.push(buildRecentSessionsContext(context.sessions, 5));
  }

  parts.push('\n=== FIN DU CONTEXTE ===');

  return parts.join('\n');
}
