import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionsWrite from '@/lib/domain/sessions/sessions-write';
import { prisma } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  prisma: {
    workouts: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    plan_sessions: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    weather_observations: {
      upsert: vi.fn(),
    },
  },
}));

describe('sessions-write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteSessions deletes in batch and recalculates once', async () => {
    vi.mocked(prisma.workouts.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.plan_sessions.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.workouts.deleteMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.plan_sessions.deleteMany).mockResolvedValue({ count: 1 } as never);

    await sessionsWrite.deleteSessions(['a', 'b', 'c'], 'user-1');

    expect(prisma.workouts.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', id: { in: ['a', 'b', 'c'] } },
    });
    expect(prisma.plan_sessions.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', id: { in: ['a', 'b', 'c'] } },
    });
    expect(prisma.workouts.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.plan_sessions.findMany).toHaveBeenCalledTimes(1);
  });

  it('updateSessionWeather returns null when workout not found', async () => {
    vi.mocked(prisma.workouts.findFirst).mockResolvedValue(null);

    const result = await sessionsWrite.updateSessionWeather('missing', 'user-1', { temperature: 10 });
    expect(result).toBeNull();
  });

  it('updateSessionWeather upserts weather when workout exists', async () => {
    vi.mocked(prisma.workouts.findFirst).mockResolvedValue({
      id: 'workout-1',
      date: new Date('2026-01-01T10:00:00Z'),
    } as never);
    vi.mocked(prisma.weather_observations.upsert).mockResolvedValue({ id: 'weather-1' } as never);

    const result = await sessionsWrite.updateSessionWeather('workout-1', 'user-1', { temperature: 12 });

    expect(result).toBe('workout-1');
    expect(prisma.weather_observations.upsert).toHaveBeenCalled();
  });
});
