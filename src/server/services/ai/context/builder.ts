import 'server-only';
import type { BuildContextParams } from '@/lib/types';
import { buildProfileContext } from './profile-context';
import { buildCurrentWeekContext, buildRecentSessionsContext } from './session-context';
import {
  buildWorkoutTypeDistribution,
  buildCompactQualityHistory,
  buildEnduranceStats,
} from './stats-context';

export function buildContextMessage({
  currentWeekSessions,
  allSessions,
  userProfile,
  nextSessionNumber,
}: BuildContextParams): string {
  let context = '=== CONTEXTE UTILISATEUR ===\n\n';

  context += buildProfileContext(userProfile, nextSessionNumber);
  context += '\n';

  context += buildCurrentWeekContext(currentWeekSessions);
  context += '\n';

  if (allSessions && allSessions.length > 0) {
    context += buildWorkoutTypeDistribution(allSessions, 4);
    context += '\n';
    context += buildCompactQualityHistory(allSessions, 5);
    context += '\n';
    context += buildEnduranceStats(allSessions);
    context += buildRecentSessionsContext(allSessions, 2);
  }

  context += '\n=== FIN DU CONTEXTE ===\n';

  return context;
}
