import 'server-only';
import { prisma } from '@/server/database';
import type { RequiredData } from '../intent/types';
import type { Session, UserProfile, TrainingSession } from '@/lib/types';
import type { NormalizedSession } from '@/lib/domain/sessions/types';
import { fetchSessions as fetchTrainingSessions } from '@/server/domain/sessions/sessions-read';

export interface FetchedContext {
  profile?: UserProfile;
  sessions?: Session[];
  currentWeekSessions?: Session[];
  nextSessionNumber?: number;
  totalSessions?: number;
  totalDistance?: number;
}

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

function normalizeSession(session: TrainingSession): NormalizedSession {
  return {
    date: session.date ?? '',
    sessionType: session.sessionType ?? '',
    avgPace: session.avgPace ?? '',
    duration: session.duration ?? '',
    comments: session.comments ?? '',
    avgHeartRate: session.avgHeartRate ?? 0,
    perceivedExertion: session.perceivedExertion ?? 0,
    distance: session.distance ?? 0,
    week: session.week ?? null,
    status: session.status ?? undefined,
    sessionNumber: session.sessionNumber ?? undefined,
    intervalDetails: session.intervalDetails ?? null,
  };
}

async function fetchSessions(userId: string, limit: number): Promise<Session[]> {
  const sessions = await fetchTrainingSessions({
    userId,
    limit,
    status: 'completed',
    sort: 'date:desc',
  });

  return sessions.map(normalizeSession);
}

async function fetchSessionStats(
  userId: string
): Promise<{ totalSessions: number; totalDistance: number }> {
  const [countResult, distanceResult] = await Promise.all([
    prisma.workouts.count({ where: { userId } }),
    prisma.workout_metrics_raw.aggregate({
      where: { workouts: { userId } },
      _sum: { distanceMeters: true },
    }),
  ]);

  return {
    totalSessions: countResult,
    totalDistance: (distanceResult._sum.distanceMeters ?? 0) / 1000,
  };
}

function calculateCurrentWeek(sessions: Session[]): number {
  if (sessions.length === 0) return 1;
  const weeks = sessions.filter((s) => s.week !== null).map((s) => s.week ?? 1);
  return weeks.length > 0 ? Math.max(...weeks, 1) : 1;
}

async function fetchNextSessionNumber(userId: string): Promise<number> {
  const workoutStats = await prisma.workouts.aggregate({
    where: { userId },
    _max: { sessionNumber: true },
  });

  return (workoutStats._max.sessionNumber ?? 0) + 1;
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
    const [sessions, nextSessionNumber] = await Promise.all([
      fetchSessions(userId, 10),
      fetchNextSessionNumber(userId),
    ]);
    return { profile, sessions, nextSessionNumber };
  }

  if (requiredData === 'stats') {
    const [sessions, stats, nextSessionNumber] = await Promise.all([
      fetchSessions(userId, 20),
      fetchSessionStats(userId),
      fetchNextSessionNumber(userId),
    ]);
    return {
      profile,
      sessions,
      nextSessionNumber,
      totalSessions: stats.totalSessions,
      totalDistance: stats.totalDistance,
    };
  }

  const [sessions, nextSessionNumber] = await Promise.all([
    fetchSessions(userId, 50),
    fetchNextSessionNumber(userId),
  ]);
  const currentWeek = calculateCurrentWeek(sessions);
  const currentWeekSessions = sessions.filter((s) => s.week === currentWeek);

  return {
    profile,
    sessions,
    currentWeekSessions,
    nextSessionNumber,
  };
}
