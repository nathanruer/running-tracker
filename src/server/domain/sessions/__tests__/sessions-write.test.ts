import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionsWrite from '@/server/domain/sessions/sessions-write';
import { prisma, tenantTransaction } from '@/server/database';

vi.mock('@/server/database', () => {
  const tables = {
    workouts: {
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    planned_workouts: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    weather_observations: {
      upsert: vi.fn(),
    },
    workout_sources: {
      updateMany: vi.fn(),
    },
  };
  return {
    prisma: tables,
    tenantTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tables)),
  };
});

function mockRecalculateData(
  workouts: Array<{ id: string; sessionNumber: number; planned_workout: { id: string; sessionNumber: number } | null }> = [],
  plans: Array<{ id: string; sessionNumber: number }> = []
) {
  vi.mocked(prisma.workouts.findMany).mockResolvedValue(workouts as never);
  vi.mocked(prisma.planned_workouts.findMany).mockResolvedValue(plans as never);
}

describe('sessions-write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recalculateSessionNumbers', () => {
    it('numbers workouts in start order, then planned sessions, and skips rows already numbered', async () => {
      mockRecalculateData(
        [
          { id: 'w1', sessionNumber: 1, planned_workout: null },
          { id: 'w2', sessionNumber: 0, planned_workout: { id: 'p2', sessionNumber: 0 } },
        ],
        [{ id: 'p3', sessionNumber: 3 }, { id: 'p4', sessionNumber: 0 }]
      );

      await sessionsWrite.recalculateSessionNumbers('user-1');

      expect(prisma.workouts.update).toHaveBeenCalledTimes(1);
      expect(prisma.workouts.update).toHaveBeenCalledWith({ where: { id: 'w2' }, data: { sessionNumber: 2 } });
      expect(prisma.planned_workouts.update).toHaveBeenCalledWith({ where: { id: 'p2' }, data: { sessionNumber: 2 } });
      expect(prisma.planned_workouts.update).toHaveBeenCalledWith({ where: { id: 'p4' }, data: { sessionNumber: 4 } });
      expect(prisma.planned_workouts.update).not.toHaveBeenCalledWith({ where: { id: 'p3' }, data: expect.anything() });
      expect(prisma.planned_workouts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', workoutId: null } })
      );
    });

    it('does not open a transaction when nothing changed', async () => {
      mockRecalculateData([{ id: 'w1', sessionNumber: 1, planned_workout: null }], [{ id: 'p2', sessionNumber: 2 }]);

      await sessionsWrite.recalculateSessionNumbers('user-1');

      expect(tenantTransaction).not.toHaveBeenCalled();
    });
  });

  describe('deleteSessions', () => {
    it('deletes the workouts and their plans in one transaction, then renumbers', async () => {
      mockRecalculateData();
      vi.mocked(prisma.workouts.deleteMany).mockResolvedValue({ count: 2 } as never);
      vi.mocked(prisma.planned_workouts.deleteMany).mockResolvedValue({ count: 1 } as never);

      await sessionsWrite.deleteSessions(['w1', 'w2'], 'user-1');

      expect(prisma.planned_workouts.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', OR: [{ id: { in: ['w1', 'w2'] } }, { workoutId: { in: ['w1', 'w2'] } }] },
      });
      expect(prisma.workouts.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', id: { in: ['w1', 'w2'] } } });
      expect(prisma.workouts.findMany).toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('removes a planned session that has no workout', async () => {
      mockRecalculateData();
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.planned_workouts.deleteMany).mockResolvedValue({ count: 1 } as never);

      await sessionsWrite.deleteSession('p1', 'user-1');

      expect(prisma.planned_workouts.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', id: 'p1', workoutId: null } });
      expect(prisma.workouts.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateSessionWeather', () => {
    it('returns null when workout not found', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(null);

      const result = await sessionsWrite.updateSessionWeather('missing', 'user-1', { temperature: 12 });

      expect(result).toBeNull();
      expect(prisma.weather_observations.upsert).not.toHaveBeenCalled();
    });

    it('upserts weather at the workout start and marks the source enriched', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue({ id: 'w1', startedAt: new Date('2026-05-01T05:00:00Z') } as never);
      vi.mocked(prisma.weather_observations.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.workout_sources.updateMany).mockResolvedValue({ count: 1 } as never);

      const result = await sessionsWrite.updateSessionWeather('w1', 'user-1', { temperature: 12, windSpeed: 5 });

      expect(result).toBe('w1');
      expect(prisma.weather_observations.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workoutId: 'w1' },
          create: expect.objectContaining({ workoutId: 'w1', observedAt: new Date('2026-05-01T05:00:00Z'), temperature: 12, windSpeed: 5 }),
        })
      );
      expect(prisma.workout_sources.updateMany).toHaveBeenCalledWith({ where: { workoutId: 'w1' }, data: { weatherStatus: 'done' } });
    });
  });
});
