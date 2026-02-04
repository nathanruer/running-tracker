import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as sessionsWrite from '@/server/domain/sessions/sessions-write';
import { prisma } from '@/server/database';

vi.mock('@/server/database', () => ({
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
    $transaction: vi.fn(),
  },
}));

describe('sessions-write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deleteSessions deletes in batch and triggers deferred recalculation', async () => {
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

    // Recalculation is deferred, so it should not have run yet during the await
    // But findMany will be called when the deferred recalculation executes
    // We need to flush the microtask queue to see the deferred execution
    await vi.runAllTimersAsync();

    // Now the deferred recalculation should have been triggered
    expect(prisma.workouts.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.plan_sessions.findMany).toHaveBeenCalledTimes(1);
  });

  describe('recalculateSessionNumbersDeferred', () => {
    it('should not block and execute in background', async () => {
      vi.mocked(prisma.workouts.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.plan_sessions.findMany).mockResolvedValue([] as never);

      // Call the deferred function - should return immediately
      sessionsWrite.recalculateSessionNumbersDeferred('user-1');

      // At this point, the recalculation hasn't started yet
      expect(prisma.workouts.findMany).not.toHaveBeenCalled();

      // Flush all pending promises/microtasks
      await vi.runAllTimersAsync();

      // Now the background task should have run
      expect(prisma.workouts.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, date: true, planSessionId: true },
      });
    });

    it('should handle errors gracefully without throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.workouts.findMany).mockRejectedValue(new Error('Database error'));

      // Should not throw
      sessionsWrite.recalculateSessionNumbersDeferred('user-1');

      // Flush all pending promises/microtasks
      await vi.runAllTimersAsync();

      // The function should have been called and failed, but not thrown
      expect(prisma.workouts.findMany).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
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
