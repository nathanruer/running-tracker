import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionsWrite from '@/server/domain/sessions/sessions-write';
import { prisma } from '@/server/database';

vi.mock('@/server/database', () => ({
  prisma: {
    workouts: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    plan_sessions: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    weather_observations: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

function mockRecalculateData(
  workouts: Array<{ id: string; date: Date; planSessionId: string | null; sessionNumber: number; week: number | null }> = [],
  unlinkedPlans: Array<{ id: string; plannedDate: Date | null; sessionNumber: number; week: number | null }> = [],
  linkedPlans: Array<{ id: string; sessionNumber: number }> = []
) {
  const findManyWorkouts = vi.mocked(prisma.workouts.findMany);
  const findManyPlans = vi.mocked(prisma.plan_sessions.findMany);

  findManyWorkouts.mockResolvedValue(workouts as never);

  let callIndex = 0;
  findManyPlans.mockImplementation((() => {
    if (callIndex === 0) {
      callIndex++;
      return Promise.resolve(unlinkedPlans);
    }
    callIndex++;
    return Promise.resolve(linkedPlans);
  }) as never);
}

describe('sessions-write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recalculateSessionNumbers', () => {
    it('assigns sequential numbers to workouts with stale numbers', async () => {
      mockRecalculateData([
        { id: 'w1', date: new Date('2026-01-01'), planSessionId: null, sessionNumber: 0, week: null },
        { id: 'w2', date: new Date('2026-01-05'), planSessionId: null, sessionNumber: 0, week: null },
        { id: 'w3', date: new Date('2026-01-10'), planSessionId: null, sessionNumber: 0, week: null },
      ]);
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);

      await sessionsWrite.recalculateSessionNumbers('user-1');

      const txCalls = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as unknown[];
      expect(txCalls).toHaveLength(3);
    });

    it('skips updates for workouts already correctly numbered', async () => {
      mockRecalculateData([
        { id: 'w1', date: new Date('2026-01-01'), planSessionId: null, sessionNumber: 1, week: 1 },
        { id: 'w2', date: new Date('2026-01-05'), planSessionId: null, sessionNumber: 2, week: 2 },
        { id: 'w3', date: new Date('2026-01-10'), planSessionId: null, sessionNumber: 3, week: 2 },
      ]);

      await sessionsWrite.recalculateSessionNumbers('user-1');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('only updates records that changed after a deletion gap', async () => {
      mockRecalculateData([
        { id: 'w1', date: new Date('2026-01-01'), planSessionId: null, sessionNumber: 1, week: 1 },
        { id: 'w3', date: new Date('2026-01-10'), planSessionId: null, sessionNumber: 3, week: 2 },
      ]);
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);

      await sessionsWrite.recalculateSessionNumbers('user-1');

      const txCalls = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as unknown[];
      expect(txCalls).toHaveLength(1);
    });

    it('assigns planned sessions with date after workouts, ordered by plannedDate', async () => {
      mockRecalculateData(
        [{ id: 'w1', date: new Date('2026-01-01'), planSessionId: null, sessionNumber: 0, week: null }],
        [
          { id: 'p2', plannedDate: new Date('2026-02-10'), sessionNumber: 0, week: null },
          { id: 'p1', plannedDate: new Date('2026-02-05'), sessionNumber: 0, week: null },
        ]
      );
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);

      await sessionsWrite.recalculateSessionNumbers('user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('assigns planned sessions without date after those with date', async () => {
      mockRecalculateData(
        [{ id: 'w1', date: new Date('2026-01-01'), planSessionId: null, sessionNumber: 0, week: null }],
        [
          { id: 'p1', plannedDate: new Date('2026-02-01'), sessionNumber: 0, week: null },
          { id: 'p2', plannedDate: null, sessionNumber: 0, week: null },
        ]
      );
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);

      await sessionsWrite.recalculateSessionNumbers('user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('syncs linked plan_sessions with their workout number', async () => {
      mockRecalculateData(
        [{ id: 'w1', date: new Date('2026-01-01'), planSessionId: 'p-linked', sessionNumber: 0, week: null }],
        [],
        [{ id: 'p-linked', sessionNumber: 0 }]
      );
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);

      await sessionsWrite.recalculateSessionNumbers('user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      const txCalls = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as unknown[];
      expect(txCalls).toHaveLength(2);
    });

    it('handles empty data without calling transaction', async () => {
      mockRecalculateData();

      await sessionsWrite.recalculateSessionNumbers('user-1');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('deleteSessions', () => {
    it('deletes in batch and triggers synchronous recalculation', async () => {
      vi.mocked(prisma.workouts.deleteMany).mockResolvedValue({ count: 2 } as never);
      vi.mocked(prisma.plan_sessions.deleteMany).mockResolvedValue({ count: 1 } as never);
      mockRecalculateData();

      await sessionsWrite.deleteSessions(['a', 'b', 'c'], 'user-1');

      expect(prisma.workouts.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: { in: ['a', 'b', 'c'] } },
      });
      expect(prisma.plan_sessions.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: { in: ['a', 'b', 'c'] } },
      });
      expect(prisma.workouts.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.plan_sessions.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateSessionWeather', () => {
    it('returns null when workout not found', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(null);

      const result = await sessionsWrite.updateSessionWeather('missing', 'user-1', { temperature: 10 });
      expect(result).toBeNull();
    });

    it('upserts weather when workout exists', async () => {
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
});
