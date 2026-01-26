import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/database';
import { createSessionToken, persistSessionCookie } from '@/lib/auth';

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  createSessionToken: vi.fn(),
  persistSessionCookie: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create user and return 201', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    vi.mocked(prisma.users.create).mockResolvedValue({
      id: 'user-123',
      email: 'newuser@example.com',
      password: 'hashed-password',
      createdAt: new Date(),
    } as never);
    vi.mocked(createSessionToken).mockReturnValue('session-token');
    vi.mocked(persistSessionCookie).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({
      user: {
        id: 'user-123',
        email: 'newuser@example.com',
      },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(createSessionToken).toHaveBeenCalledWith('user-123');
    expect(persistSessionCookie).toHaveBeenCalledWith('session-token');
  });

  it('should return 400 when email already exists', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
      id: 'existing-user',
      email: 'existing@example.com',
      password: 'hashed',
    } as never);

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Cet email est déjà utilisé.' });
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('should return 400 when email is invalid', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
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

  it('should return 400 when password is too short', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 400 when email is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should hash password before storing', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('super-secure-hash' as never);
    vi.mocked(prisma.users.create).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      password: 'super-secure-hash',
    } as never);
    vi.mocked(createSessionToken).mockReturnValue('token');
    vi.mocked(persistSessionCookie).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'plaintext-password',
      }),
    });

    await POST(request);

    expect(bcrypt.hash).toHaveBeenCalledWith('plaintext-password', 10);
    expect(prisma.users.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        password: 'super-secure-hash',
      },
    });
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.users.findUnique).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/register', {
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
