import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateSessionPosition } from '../position';
import { prisma } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      findMany: vi.fn(),
    },
  },
}));

describe('calculateSessionPosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return position 1, week 1 for first session', async () => {
    (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await calculateSessionPosition('user-123', new Date('2024-01-10'));

    expect(result).toEqual({
      sessionNumber: 1,
      week: 1,
    });
  });

  it('should calculate correct position for session in existing week', async () => {
    const mockSessions = [
      { id: 's1', date: new Date('2026-01-06'), createdAt: new Date() },
      { id: 's2', date: new Date('2026-01-07'), createdAt: new Date() }
    ];

    (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSessions
    );

    const result = await calculateSessionPosition('user-123', new Date('2026-01-09'));

    expect(result).toEqual({
      sessionNumber: 3,
      week: 1,
    });
  });

  it('should calculate correct position for session in new week', async () => {
    const mockSessions = [
      { id: 's1', date: new Date('2026-01-06'), createdAt: new Date() }, // Week 2 of 2026
      { id: 's2', date: new Date('2026-01-07'), createdAt: new Date() }, // Week 2 of 2026
    ];

    (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSessions
    );

    const result = await calculateSessionPosition('user-123', new Date('2026-01-13'));

    expect(result).toEqual({
      sessionNumber: 3,
      week: 2,
    });
  });

  it('should handle multiple sessions on same date', async () => {
    const sameDate = new Date('2026-01-10');
    const mockSessions = [
      { id: 's1', date: new Date('2026-01-06'), createdAt: new Date() },
      { id: 's2', date: sameDate, createdAt: new Date() },
      { id: 's3', date: sameDate, createdAt: new Date() },
    ];

    (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSessions
    );

    const result = await calculateSessionPosition('user-123', sameDate);

    expect(result).toEqual({
      sessionNumber: 4,
      week: 1,
    });
  });

  it('should handle weeks spanning multiple years correctly', async () => {
    const mockSessions = [
      { id: 's1', date: new Date('2025-12-29'), createdAt: new Date() },
      { id: 's2', date: new Date('2025-12-31'), createdAt: new Date() },
    ];

    (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSessions
    );

    const result = await calculateSessionPosition('user-123', new Date('2026-01-02'));

    expect(result).toEqual({
      sessionNumber: 3,
      week: 1,
    });
  });

  it('should calculate correct position for session before all existing sessions', async () => {
    const mockSessions = [
      { id: 's1', date: new Date('2026-01-15'), createdAt: new Date() },
      { id: 's2', date: new Date('2026-01-20'), createdAt: new Date() },
    ];

    (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSessions
    );

    const result = await calculateSessionPosition('user-123', new Date('2026-01-05'));

    expect(result).toEqual({
      sessionNumber: 1,
      week: 1,
    });
  });

  it('should handle session in middle of existing sessions', async () => {
    const mockSessions = [
      { id: 's1', date: new Date('2026-01-05'), createdAt: new Date() },
      { id: 's2', date: new Date('2026-01-15'), createdAt: new Date() },
      { id: 's3', date: new Date('2026-01-26'), createdAt: new Date() },
    ];

    (prisma.training_sessions.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSessions
    );

    const result = await calculateSessionPosition('user-123', new Date('2026-01-19'));

    expect(result).toEqual({
      sessionNumber: 3,
      week: 3,
    });
  });
});
