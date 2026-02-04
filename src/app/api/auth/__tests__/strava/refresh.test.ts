import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../strava/refresh/route';
import { prisma } from '@/server/database';
import { refreshAccessToken } from '@/server/services/strava';

vi.mock('@/server/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/server/services/strava', () => ({
  refreshAccessToken: vi.fn(),
}));

vi.mock('@/server/auth', () => ({
  getUserIdFromRequest: vi.fn(() => 'user-123'),
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/strava/refresh', () => {
  const mockTokenData = {
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 21600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully refresh Strava access token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaRefreshToken: 'old-refresh-token',
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(refreshAccessToken).mockResolvedValue(mockTokenData);
    vi.mocked(prisma.users.update).mockResolvedValue({
      ...mockUser,
      stravaAccessToken: mockTokenData.access_token,
      stravaRefreshToken: mockTokenData.refresh_token,
    } as never);

    const request = new NextRequest('http://localhost/api/auth/strava/refresh', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      expiresAt: mockTokenData.expires_at,
    });

    expect(refreshAccessToken).toHaveBeenCalledWith('old-refresh-token');
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        stravaAccessToken: mockTokenData.access_token,
        stravaRefreshToken: mockTokenData.refresh_token,
        stravaTokenExpiresAt: expect.any(Date),
      },
    });
  });

  it('should return 404 when user is not found', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/strava/refresh', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Utilisateur non trouvé ou non connecté à Strava' });
  });

  it('should return 404 when user has no refresh token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: null,
      stravaRefreshToken: null,
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);

    const request = new NextRequest('http://localhost/api/auth/strava/refresh', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Utilisateur non trouvé ou non connecté à Strava' });
  });

  it('should handle refresh token errors', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaRefreshToken: 'invalid-refresh-token',
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(refreshAccessToken).mockRejectedValue(new Error('Failed to refresh access token'));

    const request = new NextRequest('http://localhost/api/auth/strava/refresh', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to refresh access token' });
  });

  it('should handle database errors during update', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaRefreshToken: 'old-refresh-token',
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(refreshAccessToken).mockResolvedValue(mockTokenData);
    vi.mocked(prisma.users.update).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/strava/refresh', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Database error' });
  });
});
