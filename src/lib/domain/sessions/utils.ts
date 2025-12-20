import { prisma } from '@/lib/database';

/**
 * Generates the next session number for a user
 * Finds the maximum session number and increments it
 *
 * @param userId User ID to generate session number for
 * @returns Next available session number
 *
 * @example
 * const sessionNumber = await getNextSessionNumber(userId);
 * // sessionNumber = 5 (if user has 4 sessions)
 */
export async function getNextSessionNumber(userId: string): Promise<number> {
  const stats = await prisma.training_sessions.aggregate({
    where: { userId },
    _max: { sessionNumber: true },
  });

  return (stats._max.sessionNumber ?? 0) + 1;
}

/**
 * Gets the current maximum session number for a user
 *
 * @param userId User ID
 * @returns Current maximum session number or 0 if no sessions
 */
export async function getCurrentMaxSessionNumber(userId: string): Promise<number> {
  const stats = await prisma.training_sessions.aggregate({
    where: { userId },
    _max: { sessionNumber: true },
  });

  return stats._max.sessionNumber ?? 0;
}

/**
 * Gets the total count of sessions for a user
 *
 * @param userId User ID
 * @param status Optional status filter ('completed', 'planned', 'all')
 * @returns Total count of sessions
 */
export async function getSessionCount(
  userId: string,
  status?: 'completed' | 'planned'
): Promise<number> {
  const whereClause: { userId: string; status?: 'completed' | 'planned' } = { userId };

  if (status) {
    whereClause.status = status;
  }

  return await prisma.training_sessions.count({
    where: whereClause,
  });
}
