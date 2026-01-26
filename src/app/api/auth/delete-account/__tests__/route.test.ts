import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '../route';
import { prisma } from '@/lib/database/prisma';
import { getUserIdFromRequest, clearSessionCookie } from '@/lib/auth';

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

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('/api/auth/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete account successfully', async () => {
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

  it('should return 401 when not authenticated', async () => {
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

  it('should return 500 on database error', async () => {
    vi.mocked(getUserIdFromRequest).mockResolvedValue('user-123');
    vi.mocked(prisma.users.delete).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal server error' });
  });
});
