import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { POST } from '../password/route';
import { prisma } from '@/server/database';
import { getUserIdFromRequest } from '@/server/auth';

vi.mock('@/server/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('@/server/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/auth/password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 and success message on valid password change', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-old-password',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-new-password' as never);
    vi.mocked(prisma.users.update).mockResolvedValue(mockUser as never);

    const request = new NextRequest('http://localhost/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('new-password-123', 10);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { password: 'hashed-new-password' },
    });
  });

  it('should return 400 when current password is incorrect', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-old-password',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const request = new NextRequest('http://localhost/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'wrong-password',
        newPassword: 'new-password-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Mot de passe actuel incorrect' });
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it('should return 404 when user not found', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Utilisateur introuvable' });
  });

  it('should return 400 when current password is missing', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

    const request = new NextRequest('http://localhost/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        newPassword: 'new-password-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 400 when new password is too short', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

    const request = new NextRequest('http://localhost/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Database error' });
  });

  it('should hash password with cost factor 10', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-old-password',
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-new-password' as never);
    vi.mocked(prisma.users.update).mockResolvedValue(mockUser as never);

    const request = new NextRequest('http://localhost/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'secure-new-password',
      }),
    });

    await POST(request);

    expect(bcrypt.hash).toHaveBeenCalledWith('secure-new-password', 10);
  });
});
