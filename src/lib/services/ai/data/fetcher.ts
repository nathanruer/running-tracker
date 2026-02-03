import { prisma } from '@/lib/database';
import { normalizeSessions } from '@/lib/domain/sessions/normalizer';
import type { RequiredData } from '../intent/types';
import type { Session, UserProfile } from '@/lib/types';

export interface FetchedContext {
  profile?: UserProfile;
  sessions?: Session[];
  currentWeekSessions?: Session[];
  nextSessionNumber?: number;
  totalSessions?: number;
  totalDistance?: number;
}

const SESSION_SELECT = {
  id: true,
  sessionNumber: true,
  week: true,
  date: true,
  sessionType: true,
  duration: true,
  distance: true,
  avgPace: true,
  avgHeartRate: true,
  comments: true,
  intervalDetails: true,
  perceivedExertion: true,
  status: true,
  targetPace: true,
  targetDuration: true,
  targetDistance: true,
  targetHeartRateBpm: true,
  targetRPE: true,
};

async function fetchProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { maxHeartRate: true, vma: true, age: true, goal: true },
  });

  return {
    maxHeartRate: user?.maxHeartRate ?? undefined,
    vma: user?.vma ?? undefined,
    age: user?.age ?? undefined,
    goal: user?.goal ?? undefined,
  };
}

async function fetchSessions(userId: string, limit: number): Promise<Session[]> {
  const sessions = await prisma.training_sessions.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    select: SESSION_SELECT,
    take: limit,
  });

  return normalizeSessions(sessions as Record<string, unknown>[]);
}

async function fetchSessionStats(
  userId: string
): Promise<{ totalSessions: number; totalDistance: number }> {
  const result = await prisma.training_sessions.aggregate({
    where: { userId },
    _count: { id: true },
    _sum: { distance: true },
  });

  return {
    totalSessions: result._count.id,
    totalDistance: result._sum.distance ?? 0,
  };
}

function calculateCurrentWeek(sessions: Session[]): number {
  if (sessions.length === 0) return 1;
  const weeks = sessions.filter((s) => s.week !== null).map((s) => s.week ?? 1);
  return weeks.length > 0 ? Math.max(...weeks, 1) : 1;
}

function calculateNextSessionNumber(sessions: Session[]): number {
  const lastCompleted = sessions.find((s) => s.status === 'completed');
  return lastCompleted?.sessionNumber ? lastCompleted.sessionNumber + 1 : 1;
}

export async function fetchConditionalContext(
  userId: string,
  requiredData: RequiredData
): Promise<FetchedContext> {
  if (requiredData === 'none') {
    return {};
  }

  const profile = await fetchProfile(userId);

  if (requiredData === 'profile') {
    return { profile };
  }

  if (requiredData === 'recent') {
    const sessions = await fetchSessions(userId, 10);
    const nextSessionNumber = calculateNextSessionNumber(sessions);
    return { profile, sessions, nextSessionNumber };
  }

  if (requiredData === 'stats') {
    const [sessions, stats] = await Promise.all([
      fetchSessions(userId, 20),
      fetchSessionStats(userId),
    ]);
    const nextSessionNumber = calculateNextSessionNumber(sessions);
    return {
      profile,
      sessions,
      nextSessionNumber,
      totalSessions: stats.totalSessions,
      totalDistance: stats.totalDistance,
    };
  }

  const sessions = await fetchSessions(userId, 50);
  const currentWeek = calculateCurrentWeek(sessions);
  const currentWeekSessions = sessions.filter((s) => s.week === currentWeek);
  const nextSessionNumber = calculateNextSessionNumber(sessions);

  return {
    profile,
    sessions,
    currentWeekSessions,
    nextSessionNumber,
  };
}
