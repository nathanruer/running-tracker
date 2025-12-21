import type { NormalizedSession } from './types';

/**
 * Normalizes training sessions data for AI processing
 * Ensures all required fields have default values and dates are properly formatted
 *
 * @param sessions Raw sessions from database (Prisma query result)
 * @returns Normalized sessions with consistent field types
 */
export function normalizeSessions(sessions: Record<string, unknown>[]): NormalizedSession[] {
  return sessions.map((s) => ({
    ...s,
    date: s.date && s.date instanceof Date ? s.date.toISOString().split('T')[0] : '',
    sessionType: (s.sessionType as string) || '',
    avgPace: (s.avgPace as string) || '',
    duration: (s.duration as string) || '',
    comments: (s.comments as string) || '',
    avgHeartRate: (s.avgHeartRate as number) || 0,
    perceivedExertion: (s.perceivedExertion as number) || 0,
    distance: (s.distance as number) || 0,
  }));
}
