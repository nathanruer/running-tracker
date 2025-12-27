import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '../me/route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

describe('/api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: '2025-12-27T10:00:00.000Z',
        stravaId: 'strava-123',
        stravaTokenExpiresAt: '2025-12-27T10:00:00.000Z',
        weight: 70,
        age: 30,
        maxHeartRate: 190,
        vma: 18.5,
        goal: 'Marathon',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);

      const request = new NextRequest('http://localhost/api/auth/me');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ user: mockUser });
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          createdAt: true,
          stravaId: true,
          stravaTokenExpiresAt: true,
          weight: true,
          age: true,
          maxHeartRate: true,
          vma: true,
          goal: true,
        },
      });
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/auth/me');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.users.findUnique).not.toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/me');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Utilisateur introuvable' });
    });
  });

  describe('PUT', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = {
        id: 'user-123',
        email: 'updated@example.com',
        createdAt: '2025-12-27T10:00:00.000Z',
        stravaId: null,
        stravaTokenExpiresAt: null,
        weight: 75,
        age: 31,
        maxHeartRate: 185,
        vma: 19.0,
        goal: '10K',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.update).mockResolvedValue(updatedUser as never);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          email: 'updated@example.com',
          weight: 75,
          age: 31,
          maxHeartRate: 185,
          vma: 19.0,
          goal: '10K',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ user: updatedUser });
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          email: 'updated@example.com',
          weight: 75,
          age: 31,
          maxHeartRate: 185,
          vma: 19.0,
          goal: '10K',
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          stravaId: true,
          stravaTokenExpiresAt: true,
          weight: true,
          age: true,
          maxHeartRate: true,
          vma: true,
          goal: true,
        },
      });
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const updatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: '2025-12-27T10:00:00.000Z',
        stravaId: null,
        stravaTokenExpiresAt: null,
        weight: 75,
        age: 30,
        maxHeartRate: 190,
        vma: 18.5,
        goal: 'Marathon',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.update).mockResolvedValue(updatedUser as never);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ weight: 75 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ user: updatedUser });
      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            weight: 75,
          }),
        })
      );
    });

    it('should parse numeric fields correctly', async () => {
      const updatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: '2025-12-27T10:00:00.000Z',
        stravaId: null,
        stravaTokenExpiresAt: null,
        weight: 72.5,
        age: 28,
        maxHeartRate: 188,
        vma: 17.8,
        goal: 'Half Marathon',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.update).mockResolvedValue(updatedUser as never);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          weight: '72.5',
          age: '28',
          maxHeartRate: '188',
          vma: '17.8',
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weight: 72.5,
            age: 28,
            maxHeartRate: 188,
            vma: 17.8,
          }),
        })
      );
    });

    it('should return 500 on database error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.update).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });
});
