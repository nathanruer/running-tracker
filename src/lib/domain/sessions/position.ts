import { prisma } from '@/lib/database';

/**
 * Calculates ISO 8601 week key for a date.
 * ISO weeks start on Monday and belong to the year that contains the Thursday.
 * This ensures proper handling of weeks spanning multiple years.
 */
function getWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);

  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);

  const yearStart = new Date(d.getFullYear(), 0, 1);

  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

interface SessionPosition {
  sessionNumber: number;
  week: number;
}

/**
 * Calculates the correct position (sessionNumber and week) for a new session
 * without requiring a full recalculation of all sessions.
 *
 * This is much more efficient than the create-then-recalculate pattern.
 *
 * @param userId User ID
 * @param date Session date
 * @returns The session number and week for the new session
 */
export async function calculateSessionPosition(
  userId: string,
  date: Date
): Promise<SessionPosition> {
  const sessions = await prisma.training_sessions.findMany({
    where: {
      userId,
      date: { not: null },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, date: true },
  });

  const newSessionWeekKey = getWeekKey(date);

  const weekMap = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const weekKey = getWeekKey(session.date!);
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(session);
  }

  const sortedWeeks = Array.from(weekMap.keys()).sort();

  let weekIndex = sortedWeeks.indexOf(newSessionWeekKey);
  if (weekIndex === -1) {
    sortedWeeks.push(newSessionWeekKey);
    sortedWeeks.sort();
    weekIndex = sortedWeeks.indexOf(newSessionWeekKey);
  }

  const week = weekIndex + 1;

  let sessionNumber = 1;
  for (const session of sessions) {
    if (session.date! < date) {
      sessionNumber++;
    }
  }

  const sameDateSessions = sessions.filter(s => s.date!.getTime() === date.getTime());
  sessionNumber += sameDateSessions.length;

  return { sessionNumber, week };
}
