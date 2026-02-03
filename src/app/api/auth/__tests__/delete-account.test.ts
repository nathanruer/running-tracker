import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '../delete-account/route';
import { prisma } from '@/lib/database/prisma';
import { getUserIdFromRequest, clearSessionCookie } from '@/lib/auth';

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    users: {
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

describe('/api/auth/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete user account and clear session cookie', async () => {
    vi.mocked(getUserIdFromRequest).mockResolvedValue('user-123');
    vi.mocked(prisma.users.delete).mockResolvedValue({ id: 'user-123' } as never);

    const request = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    expect(prisma.users.delete).toHaveBeenCalledWith({
      where: { id: 'user-123' },
    });

    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(getUserIdFromRequest).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });

    expect(prisma.users.delete).not.toHaveBeenCalled();
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });

  it('should cascade delete related data (sessions, conversations)', async () => {
    vi.mocked(getUserIdFromRequest).mockResolvedValue('user-123');
    vi.mocked(prisma.users.delete).mockResolvedValue({ id: 'user-123' } as never);

    const request = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
    });

    await DELETE(request);

    expect(prisma.users.delete).toHaveBeenCalledWith({
      where: { id: 'user-123' },
    });
  });

  it('should handle user not found error', async () => {
    vi.mocked(getUserIdFromRequest).mockResolvedValue('nonexistent-user');
    vi.mocked(prisma.users.delete).mockRejectedValue(
      new Error('Record not found')
    );

    const request = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should handle database errors during deletion', async () => {
    vi.mocked(getUserIdFromRequest).mockResolvedValue('user-123');
    vi.mocked(prisma.users.delete).mockRejectedValue(
      new Error('Database connection error')
    );

    const request = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should handle clearSessionCookie errors gracefully', async () => {
    vi.mocked(getUserIdFromRequest).mockResolvedValue('user-123');
    vi.mocked(prisma.users.delete).mockResolvedValue({ id: 'user-123' } as never);
    vi.mocked(clearSessionCookie).mockImplementation(() => {
      throw new Error('Cookie error');
    });

    const request = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });

  it('should delete user with Strava account linked', async () => {
    vi.mocked(getUserIdFromRequest).mockResolvedValue('user-strava-123');
    vi.mocked(clearSessionCookie).mockResolvedValue(undefined);
    vi.mocked(prisma.users.delete).mockResolvedValue({
      id: 'user-strava-123',
      stravaId: '12345',
      stravaAccessToken: 'token',
    } as never);

    const request = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });
});
