import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../recalculate/route';
import { getUserIdFromRequest } from '@/lib/auth';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/domain/sessions', () => ({
  recalculateSessionNumbers: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/sessions/recalculate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should recalculate sessions successfully', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/recalculate', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message: 'Les semaines ont été recalculées avec succès pour toutes vos séances',
      });
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/recalculate', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(recalculateSessionNumbers).not.toHaveBeenCalled();
    });

    it('should return 500 on recalculation error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(recalculateSessionNumbers).mockRejectedValue(
        new Error('Recalculation error')
      );

      const request = new NextRequest('http://localhost/api/sessions/recalculate', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Recalculation error' });
    });
  });
});
