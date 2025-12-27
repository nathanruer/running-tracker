import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../types/route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

describe('/api/sessions/types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return list of session types', async () => {
      const mockSessions = [
        { sessionType: 'Footing' },
        { sessionType: 'Fractionné' },
        { sessionType: 'Seuil' },
      ];

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue(mockSessions as never);

      const request = new NextRequest('http://localhost/api/sessions/types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ types: ['Footing', 'Fractionné', 'Seuil'] });
      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        distinct: ['sessionType'],
        select: {
          sessionType: true,
        },
        orderBy: {
          sessionType: 'asc',
        },
      });
    });

    it('should return empty array when no sessions exist', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/sessions/types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ types: [] });
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.findMany).not.toHaveBeenCalled();
    });
  });
});
