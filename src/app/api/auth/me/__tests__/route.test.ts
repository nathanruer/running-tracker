import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '../route';
import { prisma } from '@/server/database';
import { getUserIdFromRequest } from '@/server/auth';

vi.mock('@/server/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/server/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  createdAt: new Date('2024-01-01'),
  stravaId: null,
  stravaTokenExpiresAt: null,
  weight: 70,
  age: 30,
  maxHeartRate: 190,
  vma: 15,
  goal: 'Marathon',
};

describe('/api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return user profile', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('test@example.com');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non authentifié');
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Utilisateur introuvable');
    });
  });

  describe('PUT', () => {
    it('should update user profile', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.update).mockResolvedValue({
        ...mockUser,
        weight: 75,
      } as never);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ weight: '75' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.weight).toBe(75);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ weight: '75' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non authentifié');
    });

    it('should update multiple fields', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.users.update).mockResolvedValue({
        ...mockUser,
        weight: 72,
        age: 31,
        maxHeartRate: 185,
        vma: 16,
        goal: '10K',
      } as never);

      const request = new NextRequest('http://localhost/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          weight: '72',
          age: '31',
          maxHeartRate: '185',
          vma: '16',
          goal: '10K',
        }),
      });

      const response = await PUT(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          weight: 72,
          age: 31,
          maxHeartRate: 185,
          vma: 16,
          goal: '10K',
        }),
        select: expect.any(Object),
      });
    });
  });
});
