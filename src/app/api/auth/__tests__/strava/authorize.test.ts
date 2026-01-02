import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('/api/auth/strava/authorize', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should redirect to Strava OAuth URL with correct parameters', async () => {
    process.env.STRAVA_CLIENT_ID = 'test-client-id';
    process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI = 'http://localhost:3000/api/auth/strava/callback';

    const { GET } = await import('../../strava/authorize/route');
    const response = await GET();

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBeDefined();
    expect(location).toContain('https://www.strava.com/oauth/authorize');
    expect(location).toContain('client_id=test-client-id');
    expect(location).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fstrava%2Fcallback');
    expect(location).toContain('response_type=code');
    expect(location).toContain('scope=activity%3Aread');
    expect(location).toContain('approval_prompt=auto');
  });

  it('should return 500 when STRAVA_CLIENT_ID is missing', async () => {
    delete process.env.STRAVA_CLIENT_ID;
    process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI = 'http://localhost:3000/api/auth/strava/callback';

    const { GET } = await import('../../strava/authorize/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Configuration Strava manquante' });
  });

  it('should return 500 when REDIRECT_URI is missing', async () => {
    process.env.STRAVA_CLIENT_ID = 'test-client-id';
    delete process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

    const { GET } = await import('../../strava/authorize/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Configuration Strava manquante' });
  });

  it('should return 500 when both env vars are missing', async () => {
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

    const { GET } = await import('../../strava/authorize/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Configuration Strava manquante' });
  });
});
