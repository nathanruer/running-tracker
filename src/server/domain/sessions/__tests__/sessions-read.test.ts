import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSessions, fetchSessionById } from '@/server/domain/sessions/sessions-read';
import { prisma } from '@/server/database';

vi.mock('@/server/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    workouts: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    planned_workouts: {
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
        startedAt: new Date('2026-01-01T10:00:00Z'),
        timezone: 'Europe/Paris',
        datePrecision: 'instant',
        sessionNumber: 1,
        family: 'footing',
        notes: 'Nice',
        rpe: 2,
        planned_workout: null,
        workout_intervals: [],
        durationS: 3600,
        distanceM: 10000,
        paceSKm: 360,
        avgHr: 140,
        maxHr: null,
        avgCadence: 80,
        elevationGainM: 120,
        calories: 500,
        routePolyline: null,
        workout_sources: [],
        weather_observations: null,
        workout_streams: null,
      },
    ] as never);

    vi.mocked(prisma.planned_workouts.findMany).mockResolvedValue([
      {
        id: 'plan-1',
        userId: 'user-1',
        sessionNumber: 2,
        plannedOn: new Date('2026-01-02T00:00:00Z'),
        family: 'long',
        structure: { kind: 'continuous', family: 'long', blocks: [] },
        targetDurationS: 5400,
        targetDistanceM: 15000,
        targetPaceSKm: 375,
        targetHrBpm: 150,
        targetRpe: 3,
        recommendationId: null,
        status: 'planned',
        notes: 'Plan',
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
    expect(sessions[0].localDate).toBe('2026-01-01');
    expect(sessions[0].avgPace).toBe('06:00');
    expect(sessions[1].plannedDate).toBe('2026-01-02T00:00:00.000Z');
    expect(sessions[1].sessionType).toBe('Sortie longue');
    expect(sessions[1].targetDuration).toBe(90);
    expect(sessions[1].targetPace).toBe('06:15');
  });

  it('returns null when fetchSessionById finds nothing', async () => {
    vi.mocked(prisma.workouts.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.planned_workouts.findFirst).mockResolvedValue(null);

    const session = await fetchSessionById('user-1', 'missing');
    expect(session).toBeNull();
  });

  it('returns workout when fetchSessionById matches', async () => {
    vi.mocked(prisma.workouts.findFirst).mockResolvedValue({
      id: 'workout-2',
      userId: 'user-1',
      startedAt: new Date('2026-01-03T10:00:00Z'),
      timezone: 'Europe/Paris',
      datePrecision: 'instant',
      sessionNumber: 3,
      family: 'tempo',
      notes: '',
      rpe: 4,
      planned_workout: null,
      workout_intervals: [],
      durationS: null,
      distanceM: null,
      paceSKm: null,
      avgHr: null,
      maxHr: null,
      avgCadence: null,
      elevationGainM: null,
      calories: null,
      routePolyline: null,
      workout_sources: [],
      weather_observations: null,
      workout_streams: null,
    } as never);

    const session = await fetchSessionById('user-1', 'workout-2');
    expect(session?.id).toBe('workout-2');
    expect(session?.status).toBe('completed');
  });
});
