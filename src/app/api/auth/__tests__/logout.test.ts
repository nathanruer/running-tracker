import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../logout/route';
import { clearSessionCookie } from '@/server/auth';

vi.mock('@/server/auth', () => ({
  clearSessionCookie: vi.fn(),
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear session cookie and return success', async () => {
    vi.mocked(clearSessionCookie).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });

  it('should handle clearSessionCookie errors gracefully', async () => {
    vi.mocked(clearSessionCookie).mockRejectedValue(new Error('Cookie error'));

    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Cookie error' });
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });
});
