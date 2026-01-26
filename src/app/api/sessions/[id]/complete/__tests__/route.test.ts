import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { findSessionByIdAndUser } from '@/lib/utils/api';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { fetchStreamsForSession } from '@/lib/services/strava';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/api')>();
  return {
    ...actual,
    findSessionByIdAndUser: vi.fn(),
  };
});

vi.mock('@/lib/domain/sessions', () => ({
  recalculateSessionNumbers: vi.fn(),
}));

vi.mock('@/lib/domain/sessions/enrichment', () => ({
  enrichSessionWithWeather: vi.fn(),
}));

vi.mock('@/lib/services/strava', () => ({
  fetchStreamsForSession: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const createRequest = (body: object) => {
  return new NextRequest('http://localhost/api/sessions/session-123/complete', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('/api/sessions/[id]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete a planned session', async () => {
    const plannedSession = {
      id: 'session-123',
      userId: 'user-123',
      status: 'planned',
    };
    const completedSession = {
      ...plannedSession,
      status: 'completed',
      date: new Date('2024-01-01'),
      duration: '01:00:00',
      distance: 10,
    };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
    vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
    vi.mocked(prisma.training_sessions.update).mockResolvedValue(completedSession as never);
    vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(completedSession as never);
    vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

    const response = await PATCH(
      createRequest({
        date: '2024-01-01',
        duration: '01:00:00',
        distance: '10',
        avgPace: '06:00',
        avgHeartRate: '150',
      }),
      createParams('session-123')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('completed');
    expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
  });

  it('should return 401 when not authenticated', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue(null);

    const response = await PATCH(
      createRequest({ date: '2024-01-01' }),
      createParams('session-123')
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });

  it('should return 404 when session not found', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

    const response = await PATCH(
      createRequest({ date: '2024-01-01' }),
      createParams('session-123')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Séance non trouvée');
  });

  it('should return 400 when session is not planned', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue({
      id: 'session-123',
      status: 'completed',
    } as never);

    const response = await PATCH(
      createRequest({ date: '2024-01-01' }),
      createParams('session-123')
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Cette séance n'est pas planifiée");
  });

  it('should enrich with weather from strava data', async () => {
    const plannedSession = {
      id: 'session-123',
      userId: 'user-123',
      status: 'planned',
    };
    const weather = { temperature: 15, conditionCode: 1, windSpeed: 5, precipitation: 0 };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
    vi.mocked(enrichSessionWithWeather).mockResolvedValue(weather);
    vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
    vi.mocked(prisma.training_sessions.update).mockResolvedValue({ ...plannedSession, weather } as never);
    vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue({ ...plannedSession, weather } as never);
    vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

    const response = await PATCH(
      createRequest({
        date: '2024-01-01',
        duration: '01:00:00',
        distance: '10',
        avgPace: '06:00',
        avgHeartRate: '150',
        stravaData: { id: 12345 },
      }),
      createParams('session-123')
    );

    expect(enrichSessionWithWeather).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
