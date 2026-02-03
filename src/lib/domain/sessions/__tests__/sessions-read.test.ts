import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSessions, fetchSessionById } from '@/lib/domain/sessions/sessions-read';
import { prisma } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    workouts: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    plan_sessions: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('sessions-read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated sessions in SQL order', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([
      { id: 'workout-1', kind: 'workout' },
      { id: 'plan-1', kind: 'plan' },
    ] as never);

    vi.mocked(prisma.workouts.findMany).mockResolvedValue([
      {
        id: 'workout-1',
        userId: 'user-1',
        planSessionId: null,
        date: new Date('2026-01-01T10:00:00Z'),
        status: 'completed',
        sessionNumber: 1,
        week: 1,
        sessionType: 'Easy',
        comments: 'Nice',
        perceivedExertion: 2,
        plan_sessions: null,
        workout_metrics_raw: {
          durationSeconds: 3600,
          distanceMeters: 10000,
          avgPace: '06:00',
          avgHeartRate: 140,
          averageCadence: 80,
          elevationGain: 120,
          calories: 500,
        },
        external_activities: [],
        weather_observations: null,
        workout_streams: [],
      },
    ] as never);

    vi.mocked(prisma.plan_sessions.findMany).mockResolvedValue([
      {
        id: 'plan-1',
        userId: 'user-1',
        sessionNumber: 2,
        week: 1,
        plannedDate: new Date('2026-01-02T10:00:00Z'),
        sessionType: 'Long',
        status: 'planned',
        targetDuration: 90,
        targetDistance: 15,
        targetPace: '06:15',
        targetHeartRateBpm: '150',
        targetRPE: 3,
        intervalDetails: null,
        recommendationId: null,
        comments: 'Plan',
      },
    ] as never);

    const sessions = await fetchSessions({
      userId: 'user-1',
      limit: 10,
      offset: 0,
      status: 'all',
      sort: 'date:desc',
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe('workout-1');
    expect(sessions[1].id).toBe('plan-1');
    expect(sessions[0].date).toBe('2026-01-01T10:00:00.000Z');
    expect(sessions[1].plannedDate).toBe('2026-01-02T10:00:00.000Z');
  });

  it('returns null when fetchSessionById finds nothing', async () => {
    vi.mocked(prisma.workouts.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.plan_sessions.findFirst).mockResolvedValue(null);

    const session = await fetchSessionById('user-1', 'missing');
    expect(session).toBeNull();
  });

  it('returns workout when fetchSessionById matches', async () => {
    vi.mocked(prisma.workouts.findFirst).mockResolvedValue({
      id: 'workout-2',
      userId: 'user-1',
      planSessionId: null,
      date: new Date('2026-01-03T10:00:00Z'),
      status: 'completed',
      sessionNumber: 3,
      week: 1,
      sessionType: 'Tempo',
      comments: '',
      perceivedExertion: 4,
      plan_sessions: null,
      workout_metrics_raw: null,
      external_activities: [],
      weather_observations: null,
      workout_streams: [],
    } as never);

    const session = await fetchSessionById('user-1', 'workout-2');
    expect(session?.id).toBe('workout-2');
    expect(session?.status).toBe('completed');
  });
});
