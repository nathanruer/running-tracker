import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recalculateSessionNumbers } from '../calculator';
import { prisma } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      findMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}));

describe('calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recalculateSessionNumbers', () => {
    it('should handle empty sessions array', async () => {
      (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await recalculateSessionNumbers('user-123');

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, date: true, status: true, sessionNumber: true },
      });

      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should assign sequential session numbers ordered by date', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          date: new Date('2024-01-05'),
          status: 'completed',
          sessionNumber: 0,
        },
        {
          id: 'session-2',
          date: new Date('2024-01-10'),
          status: 'completed',
          sessionNumber: 0,
        },
        {
          id: 'session-3',
          date: new Date('2024-01-03'),
          status: 'completed',
          sessionNumber: 0,
        },
      ];

      (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSessions
      );
      (prisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await recalculateSessionNumbers('user-123');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);

      const sqlCall = (prisma.$executeRaw as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(sqlCall).toBeDefined();

      const query = String(sqlCall[0]);
      expect(query).toContain('UPDATE training_sessions');
      expect(query).toContain('sessionNumber');
      expect(query).toContain('week');
    });

    it('should group sessions into weeks and assign week numbers', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          date: new Date('2024-01-01'), // Week 1
          status: 'completed',
          sessionNumber: 0,
        },
        {
          id: 'session-2',
          date: new Date('2024-01-03'), // Week 1
          status: 'completed',
          sessionNumber: 0,
        },
        {
          id: 'session-3',
          date: new Date('2024-01-08'), // Week 2 (Monday)
          status: 'completed',
          sessionNumber: 0,
        },
      ];

      (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSessions
      );
      (prisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await recalculateSessionNumbers('user-123');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);

      const query = String((prisma.$executeRaw as ReturnType<typeof vi.fn>).mock.calls[0][0]);
      expect(query).toContain('week = CASE');
    });

    it('should handle planned sessions without dates', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          date: new Date('2024-01-05'),
          status: 'completed',
          sessionNumber: 0,
        },
        {
          id: 'planned-1',
          date: null,
          status: 'planned',
          sessionNumber: 0,
        },
        {
          id: 'planned-2',
          date: null,
          status: 'planned',
          sessionNumber: 0,
        },
      ];

      (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSessions
      );
      (prisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await recalculateSessionNumbers('user-123');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should place planned sessions without dates after dated sessions', async () => {
      const mockSessions = [
        {
          id: 'planned-1',
          date: null,
          status: 'planned',
          sessionNumber: 0,
        },
        {
          id: 'session-1',
          date: new Date('2024-01-05'),
          status: 'completed',
          sessionNumber: 0,
        },
      ];

      (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSessions
      );
      (prisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await recalculateSessionNumbers('user-123');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should handle sessions on the same date consistently', async () => {
      const sameDate = new Date('2024-01-05T10:00:00Z');
      const mockSessions = [
        {
          id: 'session-1',
          date: sameDate,
          status: 'completed',
          sessionNumber: 0,
          createdAt: new Date('2024-01-05T09:00:00Z'),
        },
        {
          id: 'session-2',
          date: sameDate,
          status: 'completed',
          sessionNumber: 0,
          createdAt: new Date('2024-01-05T11:00:00Z'),
        },
      ];

      (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSessions
      );
      (prisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await recalculateSessionNumbers('user-123');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple weeks correctly', async () => {
      const mockSessions = [
        {
          id: 'w1-s1',
          date: new Date('2024-01-01'), // Week 1, Monday
          status: 'completed',
          sessionNumber: 0,
        },
        {
          id: 'w1-s2',
          date: new Date('2024-01-03'), // Week 1, Wednesday
          status: 'completed',
          sessionNumber: 0,
        },
        {
          id: 'w2-s1',
          date: new Date('2024-01-08'), // Week 2, Monday
          status: 'completed',
          sessionNumber: 0,
        },
        {
          id: 'w3-s1',
          date: new Date('2024-01-15'), // Week 3, Monday
          status: 'completed',
          sessionNumber: 0,
        },
      ];

      (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSessions
      );
      (prisma.$executeRaw as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await recalculateSessionNumbers('user-123');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should not execute update if no sessions need updating', async () => {
      (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await recalculateSessionNumbers('user-123');

      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });
});
