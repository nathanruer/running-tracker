import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getOptionalAuth } from '../middleware';
import { getUserIdFromRequest } from '../index';

vi.mock('../index', () => ({
  getUserIdFromRequest: vi.fn(),
}));

describe('auth/middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return success with userId when authenticated', () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
      });

      const result = requireAuth(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBe('user-123');
      }
    });

    it('should return error response when not authenticated', () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
      });

      const result = requireAuth(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NextResponse);
      }
    });

    it('should return 401 status when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
      });

      const result = requireAuth(request);

      if (!result.success) {
        expect(result.error.status).toBe(401);
        const data = await result.error.json();
        expect(data.error).toBe('Non authentifié');
      }
    });
  });

  describe('getOptionalAuth', () => {
    it('should return userId when authenticated', () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
      });

      const result = getOptionalAuth(request);

      expect(result).toBe('user-123');
    });

    it('should return null when not authenticated', () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
      });

      const result = getOptionalAuth(request);

      expect(result).toBeNull();
    });
  });
});
