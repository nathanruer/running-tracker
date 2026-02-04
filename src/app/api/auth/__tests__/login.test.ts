import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { POST } from '../login/route';
import { prisma } from '@/server/database';
import { createSessionToken, persistSessionCookie } from '@/server/auth';

vi.mock('@/server/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('@/server/auth', () => ({
  createSessionToken: vi.fn(),
  persistSessionCookie: vi.fn(),
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 and user on valid credentials', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-password',
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(createSessionToken).mockReturnValue('session-token');
    vi.mocked(persistSessionCookie).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    });
    expect(createSessionToken).toHaveBeenCalledWith('user-123');
    expect(persistSessionCookie).toHaveBeenCalledWith('session-token');
  });

  it('should return 401 when user not found', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'notfound@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Identifiants invalides' });
    expect(createSessionToken).not.toHaveBeenCalled();
  });

  it('should return 401 when password is incorrect', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-password',
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrong-password',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Identifiants invalides' });
    expect(createSessionToken).not.toHaveBeenCalled();
  });

  it('should return 400 when email is invalid', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 400 when password is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.users.findUnique).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Database error' });
  });
});
