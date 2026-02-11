import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/server/database';
import { getUserIdFromRequest, createSessionToken } from '@/server/auth';
import { STRAVA_ERRORS } from '@/lib/constants';

vi.mock('@/server/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    external_accounts: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    user_profiles: {
      create: vi.fn(),
    },
    user_preferences: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/server/auth', () => ({
  getUserIdFromRequest: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock('@/server/infrastructure/logger', () => ({
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
    expect(location).toContain('/error');
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
    expect(location).toContain('/error');
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
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.external_accounts.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(null as never);
    vi.mocked(prisma.external_accounts.upsert).mockResolvedValue({
      userId: 'user-123',
      provider: 'strava',
      externalId: '12345',
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

    expect(prisma.external_accounts.upsert).toHaveBeenCalledWith({
      where: {
        userId_provider: {
          userId: 'user-123',
          provider: 'strava',
        },
      },
      create: {
        userId: 'user-123',
        provider: 'strava',
        externalId: '12345',
        accessToken: mockStravaTokenResponse.access_token,
        refreshToken: mockStravaTokenResponse.refresh_token,
        tokenExpiresAt: expect.any(Date),
      },
      update: {
        externalId: '12345',
        accessToken: mockStravaTokenResponse.access_token,
        refreshToken: mockStravaTokenResponse.refresh_token,
        tokenExpiresAt: expect.any(Date),
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

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(currentUser as never);
    vi.mocked(prisma.external_accounts.findUnique).mockResolvedValue({
      userId: 'user-456',
      provider: 'strava',
      externalId: '12345',
    } as never);
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
    expect(location).toContain('/error');
    expect(location).toContain(`error=${STRAVA_ERRORS.ALREADY_LINKED}`);
  });

  it('should prevent user from linking if they already have a Strava account', async () => {
    const currentUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(currentUser as never);
    vi.mocked(prisma.external_accounts.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        userId: 'user-123',
        provider: 'strava',
        externalId: '99999',
      } as never);
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
    expect(location).toContain('/error');
    expect(location).toContain(`error=${STRAVA_ERRORS.ALREADY_LINKED}`);
  });

  it('should update tokens for existing Strava user (re-authentication)', async () => {
    const existingStravaUser = {
      id: 'user-strava',
      email: 'strava_12345@strava.local',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue(null);
    vi.mocked(prisma.external_accounts.findUnique).mockResolvedValue({
      userId: 'user-strava',
      provider: 'strava',
      externalId: '12345',
    } as never);
    vi.mocked(prisma.users.findUnique).mockResolvedValue(existingStravaUser as never);
    vi.mocked(prisma.external_accounts.update).mockResolvedValue({
      userId: 'user-strava',
      provider: 'strava',
      externalId: '12345',
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

    expect(prisma.external_accounts.update).toHaveBeenCalledWith({
      where: {
        userId_provider: {
          userId: 'user-strava',
          provider: 'strava',
        },
      },
      data: {
        accessToken: mockStravaTokenResponse.access_token,
        refreshToken: mockStravaTokenResponse.refresh_token,
        tokenExpiresAt: expect.any(Date),
      },
    });
  });

  it('should create new user for first-time Strava login', async () => {
    const newUser = {
      id: 'new-user-id',
      email: 'strava_12345@strava.local',
      password: '',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue(null);
    vi.mocked(prisma.external_accounts.findUnique).mockResolvedValue(null);
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
        profile: { create: {} },
        preferences: { create: {} },
        externalAccounts: {
          create: {
            provider: 'strava',
            externalId: '12345',
            accessToken: mockStravaTokenResponse.access_token,
            refreshToken: mockStravaTokenResponse.refresh_token,
            tokenExpiresAt: expect.any(Date),
          },
        },
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
    expect(location).toContain('/error');
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
    expect(location).toContain('/error');
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
    expect(location).toContain('/error');
    expect(location).toContain(`error=${STRAVA_ERRORS.AUTH_FAILED}`);
  });
});
