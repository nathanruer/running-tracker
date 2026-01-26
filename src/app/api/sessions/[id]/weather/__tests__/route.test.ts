import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { findSessionByIdAndUser } from '@/lib/utils/api';
import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      update: vi.fn(),
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

vi.mock('@/lib/domain/sessions/enrichment', () => ({
  enrichSessionWithWeather: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const createRequest = () => {
  return new NextRequest('http://localhost/api/sessions/session-123/weather', {
    method: 'PATCH',
  });
};

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('/api/sessions/[id]/weather', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue(null);

    const response = await PATCH(createRequest(), createParams('session-123'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });

  it('should return 404 when session not found', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

    const response = await PATCH(createRequest(), createParams('session-123'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Séance non trouvée');
  });

  it('should return existing weather if session already has weather', async () => {
    const existingWeather = { temperature: 20, conditionCode: 1, windSpeed: 5, precipitation: 0 };
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue({
      id: 'session-123',
      weather: existingWeather,
    } as never);

    const response = await PATCH(createRequest(), createParams('session-123'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Cette séance a déjà des données météo');
    expect(data.weather).toEqual(existingWeather);
    expect(enrichSessionWithWeather).not.toHaveBeenCalled();
  });

  it('should return 400 when session has no strava data', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue({
      id: 'session-123',
      weather: null,
      stravaData: null,
    } as never);

    const response = await PATCH(createRequest(), createParams('session-123'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Cette séance n'a pas de données Strava pour l'enrichissement");
  });

  it('should return 400 when session has no date', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue({
      id: 'session-123',
      weather: null,
      stravaData: { id: 12345 },
      date: null,
    } as never);

    const response = await PATCH(createRequest(), createParams('session-123'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Cette séance n'a pas de date");
  });

  it('should enrich session with weather', async () => {
    const session = {
      id: 'session-123',
      weather: null,
      stravaData: { id: 12345 },
      date: new Date('2024-01-01'),
    };
    const weather = { temperature: 15, conditionCode: 1, windSpeed: 5, precipitation: 0 };

    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(session as never);
    vi.mocked(enrichSessionWithWeather).mockResolvedValue(weather);
    vi.mocked(prisma.training_sessions.update).mockResolvedValue({ ...session, weather } as never);

    const response = await PATCH(createRequest(), createParams('session-123'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.weather).toEqual(weather);
    expect(prisma.training_sessions.update).toHaveBeenCalledWith({
      where: { id: 'session-123' },
      data: { weather },
    });
  });

  it('should return 500 when weather enrichment fails', async () => {
    vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
    vi.mocked(findSessionByIdAndUser).mockResolvedValue({
      id: 'session-123',
      weather: null,
      stravaData: { id: 12345 },
      date: new Date('2024-01-01'),
    } as never);
    vi.mocked(enrichSessionWithWeather).mockResolvedValue(null);

    const response = await PATCH(createRequest(), createParams('session-123'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Impossible de récupérer les données météo pour cette séance');
  });
});
