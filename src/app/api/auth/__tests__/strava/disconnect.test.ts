import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../strava/disconnect/route';
import { prisma } from '@/lib/database';

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(() => 'user-123'),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/strava/disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully disconnect Strava account', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'access-token',
      stravaRefreshToken: 'refresh-token',
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.users.update).mockResolvedValue({
      ...mockUser,
      stravaId: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiresAt: null,
    } as never);

    const request = new NextRequest('http://localhost/api/auth/strava/disconnect', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Compte Strava déconnecté avec succès',
    });

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        stravaId: null,
        stravaAccessToken: null,
        stravaRefreshToken: null,
        stravaTokenExpiresAt: null,
      },
    });
  });

  it('should return 404 when user is not found', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/strava/disconnect', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Utilisateur non trouvé' });
  });

  it('should return 400 when user has no Strava account linked', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: null,
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);

    const request = new NextRequest('http://localhost/api/auth/strava/disconnect', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Aucun compte Strava n'est actuellement lié" });
  });

  it('should handle database errors', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.users.update).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/strava/disconnect', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Database error' });
  });
});
