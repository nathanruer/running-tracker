import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextSessionNumber, getCurrentMaxSessionNumber, getSessionCount } from '../utils';
import { prisma } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('sessions/utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNextSessionNumber', () => {
    it('should return 1 when user has no sessions', async () => {
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: null },
      } as never);

      const result = await getNextSessionNumber('user-123');

      expect(result).toBe(1);
      expect(prisma.training_sessions.aggregate).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        _max: { sessionNumber: true },
      });
    });

    it('should return next number when user has existing sessions', async () => {
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: 5 },
      } as never);

      const result = await getNextSessionNumber('user-456');

      expect(result).toBe(6);
    });

    it('should handle large session numbers', async () => {
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: 999 },
      } as never);

      const result = await getNextSessionNumber('user-789');

      expect(result).toBe(1000);
    });
  });

  describe('getCurrentMaxSessionNumber', () => {
    it('should return 0 when user has no sessions', async () => {
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: null },
      } as never);

      const result = await getCurrentMaxSessionNumber('user-123');

      expect(result).toBe(0);
    });

    it('should return max session number when user has sessions', async () => {
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: 42 },
      } as never);

      const result = await getCurrentMaxSessionNumber('user-456');

      expect(result).toBe(42);
    });
  });

  describe('getSessionCount', () => {
    it('should return total count when no status filter', async () => {
      vi.mocked(prisma.training_sessions.count).mockResolvedValue(10);

      const result = await getSessionCount('user-123');

      expect(result).toBe(10);
      expect(prisma.training_sessions.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should return completed count when status is completed', async () => {
      vi.mocked(prisma.training_sessions.count).mockResolvedValue(7);

      const result = await getSessionCount('user-123', 'completed');

      expect(result).toBe(7);
      expect(prisma.training_sessions.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'completed' },
      });
    });

    it('should return planned count when status is planned', async () => {
      vi.mocked(prisma.training_sessions.count).mockResolvedValue(3);

      const result = await getSessionCount('user-123', 'planned');

      expect(result).toBe(3);
      expect(prisma.training_sessions.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'planned' },
      });
    });

    it('should return 0 when user has no sessions', async () => {
      vi.mocked(prisma.training_sessions.count).mockResolvedValue(0);

      const result = await getSessionCount('new-user');

      expect(result).toBe(0);
    });
  });
});
