import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest, createSessionToken } from '@/lib/auth';
import { STRAVA_ERRORS } from '@/lib/constants';

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/strava/callback', () => {
  const mockStravaTokenResponse = {
    access_token: 'strava-access-token',
    refresh_token: 'strava-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 21600,
    athlete: {
      id: 12345,
      username: 'testathlete',
      firstname: 'Test',
      lastname: 'Athlete',
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    global.fetch = vi.fn();

    process.env.STRAVA_CLIENT_ID = 'test-client-id';
    process.env.STRAVA_CLIENT_SECRET = 'test-client-secret';
    process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI = 'http://localhost:3000/api/auth/strava/callback';
  });

  it('should redirect to error page when error parameter is present', async () => {
    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?error=access_denied'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/error/strava');
    expect(location).toContain(`error=${STRAVA_ERRORS.AUTH_FAILED}`);
  });

  it('should redirect to error page when code parameter is missing', async () => {
    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/error/strava');
    expect(location).toContain(`error=${STRAVA_ERRORS.AUTH_FAILED}`);
  });

  it('should return 500 when Strava config is missing', async () => {
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.STRAVA_CLIENT_SECRET;
    delete process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=test-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Configuration Strava manquante' });
  });

  it('should link Strava account to existing logged-in user', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-password',
      stravaId: null,
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.users.update).mockResolvedValue({
      ...mockUser,
      stravaId: '12345',
      stravaAccessToken: mockStravaTokenResponse.access_token,
    } as never);
    vi.mocked(createSessionToken).mockReturnValue('session-token');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockStravaTokenResponse,
    } as Response);

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=test-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/dashboard');

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        stravaId: '12345',
        stravaAccessToken: mockStravaTokenResponse.access_token,
        stravaRefreshToken: mockStravaTokenResponse.refresh_token,
        stravaTokenExpiresAt: expect.any(Date),
      },
    });

    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain('session=');
    expect(setCookieHeader).toContain('session-token');
  });

  it('should prevent linking Strava account already linked to another user', async () => {
    const currentUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: null,
    };

    const otherUser = {
      id: 'user-456',
      email: 'other@example.com',
      stravaId: '12345',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(currentUser as never);
    vi.mocked(prisma.users.findFirst).mockResolvedValue(otherUser as never);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockStravaTokenResponse,
    } as Response);

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=test-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/error/strava');
    expect(location).toContain(`error=${STRAVA_ERRORS.ALREADY_LINKED}`);
  });

  it('should prevent user from linking if they already have a Strava account', async () => {
    const currentUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '99999',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(currentUser as never);
    vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockStravaTokenResponse,
    } as Response);

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=test-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/error/strava');
    expect(location).toContain(`error=${STRAVA_ERRORS.ALREADY_LINKED}`);
  });

  it('should update tokens for existing Strava user (re-authentication)', async () => {
    const existingStravaUser = {
      id: 'user-strava',
      email: 'strava_12345@strava.local',
      stravaId: '12345',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue(null);
    vi.mocked(prisma.users.findUnique)
      .mockResolvedValueOnce(existingStravaUser as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.users.update).mockResolvedValue({
      ...existingStravaUser,
      stravaAccessToken: mockStravaTokenResponse.access_token,
    } as never);
    vi.mocked(createSessionToken).mockReturnValue('session-token');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockStravaTokenResponse,
    } as Response);

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=test-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/dashboard');

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-strava' },
      data: {
        stravaAccessToken: mockStravaTokenResponse.access_token,
        stravaRefreshToken: mockStravaTokenResponse.refresh_token,
        stravaTokenExpiresAt: expect.any(Date),
      },
    });
  });

  it('should create new user for first-time Strava login', async () => {
    const newUser = {
      id: 'new-user-id',
      email: 'strava_12345@strava.local',
      password: '',
      stravaId: '12345',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue(null);
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.users.create).mockResolvedValue(newUser as never);
    vi.mocked(createSessionToken).mockReturnValue('session-token');
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockStravaTokenResponse,
    } as Response);

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=test-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/dashboard');

    expect(prisma.users.create).toHaveBeenCalledWith({
      data: {
        email: 'strava_12345@strava.local',
        password: '',
        stravaId: '12345',
        stravaAccessToken: mockStravaTokenResponse.access_token,
        stravaRefreshToken: mockStravaTokenResponse.refresh_token,
        stravaTokenExpiresAt: expect.any(Date),
      },
    });
  });

  it('should redirect to error page when Strava token exchange fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'invalid_grant' }),
    } as Response);

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=invalid-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/error/strava');
    expect(location).toContain(`error=${STRAVA_ERRORS.AUTH_FAILED}`);
  });

  it('should handle Strava rate limit error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({
        message: 'Rate Limit Exceeded',
        errors: [{ code: 'Rate Limit Exceeded' }],
      }),
    } as Response);

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=test-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/error/strava');
    expect(location).toContain(`error=${STRAVA_ERRORS.API_LIMIT}`);
  });

  it('should handle unexpected errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const request = new NextRequest(
      'http://localhost/api/auth/strava/callback?code=test-code'
    );

    const { GET } = await import('../../strava/callback/route');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/error/strava');
    expect(location).toContain(`error=${STRAVA_ERRORS.AUTH_FAILED}`);
  });
});
