import 'server-only';
import { prisma } from '@/server/database';
import type { Session, UserProfile, TrainingSession } from '@/lib/types';
import type { NormalizedSession } from '@/lib/domain/sessions/types';
import { fetchSessions as fetchTrainingSessions } from '@/server/domain/sessions/sessions-read';
import { extractDatePart } from '@/lib/utils/date';

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      profile: {
        select: { maxHeartRate: true, vma: true, age: true, goal: true },
      },
    },
  });

  return {
    maxHeartRate: user?.profile?.maxHeartRate ?? undefined,
    vma: user?.profile?.vma ?? undefined,
    age: user?.profile?.age ?? undefined,
    goal: user?.profile?.goal ?? undefined,
  };
}

function normalizeSession(session: TrainingSession): NormalizedSession {
  return {
    date: session.date ?? '',
    localDate: session.localDate ?? (session.date ? extractDatePart(session.date) : ''),
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

export async function fetchSessions(userId: string, limit: number): Promise<Session[]> {
  const sessions = await fetchTrainingSessions({
    userId,
    limit,
    status: 'completed',
    sort: 'date:desc',
  });

  return sessions.map(normalizeSession);
}

export async function fetchSessionStats(
  userId: string
): Promise<{ totalSessions: number; totalDistance: number }> {
  const stats = await prisma.workouts.aggregate({
    where: { userId },
    _count: { _all: true },
    _sum: { distanceM: true },
  });

  return {
    totalSessions: stats._count._all,
    totalDistance: (stats._sum.distanceM ?? 0) / 1000,
  };
}

export async function fetchNextSessionNumber(userId: string): Promise<number> {
  const workoutStats = await prisma.workouts.aggregate({
    where: { userId },
    _max: { sessionNumber: true },
  });

  return (workoutStats._max.sessionNumber ?? 0) + 1;
}
