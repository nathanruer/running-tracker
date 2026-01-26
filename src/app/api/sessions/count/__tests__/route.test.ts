import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

describe('/api/sessions/count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (params: string = '') => {
    return new NextRequest(`http://localhost/api/sessions/count?${params}`, {
      method: 'GET',
    });
  };

  it('should return count for all sessions', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.training_sessions.count).mockResolvedValue(10);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(10);
    expect(prisma.training_sessions.count).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
  });

  it('should filter by specific session type', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.training_sessions.count).mockResolvedValue(5);

    const response = await GET(createRequest('type=Running'));
    const data = await response.json();

    expect(data.count).toBe(5);
    expect(prisma.training_sessions.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        sessionType: 'Running',
      },
    });
  });

  it('should ignore "all" session type filter', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.training_sessions.count).mockResolvedValue(10);

    await GET(createRequest('type=all'));

    expect(prisma.training_sessions.count).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
  });

  it('should filter by dateFrom', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.training_sessions.count).mockResolvedValue(3);

    const dateStr = '2024-01-01';
    await GET(createRequest(`dateFrom=${dateStr}`));

    expect(prisma.training_sessions.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        date: {
          gte: new Date(dateStr),
        },
      },
    });
  });

  it('should filter by search term', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.training_sessions.count).mockResolvedValue(2);

    await GET(createRequest('search=interval'));

    expect(prisma.training_sessions.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        OR: [
          { comments: { contains: 'interval', mode: 'insensitive' } },
          { sessionType: { contains: 'interval', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('should return 401 when not authenticated', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue(null);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });
});
