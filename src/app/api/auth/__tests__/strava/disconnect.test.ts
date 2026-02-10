import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../strava/disconnect/route';
import { prisma } from '@/server/database';

vi.mock('@/server/database', () => ({
  prisma: {
    external_accounts: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/server/auth', () => ({
  getUserIdFromRequest: vi.fn(() => 'user-123'),
}));

describe('/api/auth/strava/disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully disconnect Strava account', async () => {
    const mockAccount = {
      userId: 'user-123',
      provider: 'strava',
      externalId: '12345',
    };

    vi.mocked(prisma.external_accounts.findUnique).mockResolvedValue(mockAccount as never);
    vi.mocked(prisma.external_accounts.deleteMany).mockResolvedValue({ count: 1 } as never);

    const request = new NextRequest('http://localhost/api/auth/strava/disconnect', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Compte Strava déconnecté avec succès',
    });

    expect(prisma.external_accounts.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', provider: 'strava' },
    });
  });

  it('should return 400 when user has no Strava account linked', async () => {
    vi.mocked(prisma.external_accounts.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/strava/disconnect', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Aucun compte Strava n'est actuellement lié" });
  });

  it('should handle database errors', async () => {
    const mockAccount = {
      userId: 'user-123',
      provider: 'strava',
      externalId: '12345',
    };

    vi.mocked(prisma.external_accounts.findUnique).mockResolvedValue(mockAccount as never);
    vi.mocked(prisma.external_accounts.deleteMany).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/strava/disconnect', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Database error' });
  });
});
