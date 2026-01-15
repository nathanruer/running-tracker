import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../[id]/weather/route';
import { prisma } from '@/lib/database';
import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { HTTP_STATUS } from '@/lib/constants';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/domain/sessions/enrichment', () => ({
  enrichSessionWithWeather: vi.fn(),
}));

vi.mock('@/lib/utils/api', () => ({
  findSessionByIdAndUser: vi.fn(),
}));

vi.mock('@/lib/services/api-handlers', () => ({
  handleApiRequest: vi.fn((request, schema, handler) => {
    return handler(null, 'mock-user-id');
  }),
}));

import { findSessionByIdAndUser } from '@/lib/utils/api';

describe('PATCH /api/sessions/[id]/weather', () => {
  const mockSessionId = 'session-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = () => {
    return new NextRequest('http://localhost:3000/api/sessions/session-123/weather', {
      method: 'PATCH',
    });
  };

  it('should return 404 if session not found', async () => {
    const request = createMockRequest();
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

    const response = await PATCH(request, {
      params: Promise.resolve({ id: mockSessionId }),
    });

    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(data.error).toBe('Séance non trouvée');
  });

  it('should return 200 if session already has weather data', async () => {
    const mockWeather = {
      conditionCode: 1,
      temperature: 15,
      windSpeed: 10,
      precipitation: 0,
    };

    const mockSession = {
      id: mockSessionId,
      userId: mockUserId,
      date: new Date('2024-01-01'),
      weather: mockWeather,
      stravaData: { map: { summary_polyline: 'abc' } },
    };

    const request = createMockRequest();
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(mockSession as never);

    const response = await PATCH(request, {
      params: Promise.resolve({ id: mockSessionId }),
    });

    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(data.message).toBe('Cette séance a déjà des données météo');
    expect(data.weather).toEqual(mockWeather);
    expect(enrichSessionWithWeather).not.toHaveBeenCalled();
  });

  it('should return 400 if session has no Strava data', async () => {
    const mockSession = {
      id: mockSessionId,
      userId: mockUserId,
      date: new Date('2024-01-01'),
      weather: null,
      stravaData: null,
    };

    const request = createMockRequest();
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(mockSession as never);

    const response = await PATCH(request, {
      params: Promise.resolve({ id: mockSessionId }),
    });

    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(data.error).toBe("Cette séance n'a pas de données Strava pour l'enrichissement");
  });

  it('should return 400 if session has no date', async () => {
    const mockSession = {
      id: mockSessionId,
      userId: mockUserId,
      date: null,
      weather: null,
      stravaData: { map: { summary_polyline: 'abc' } },
    };

    const request = createMockRequest();
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(mockSession as never);

    const response = await PATCH(request, {
      params: Promise.resolve({ id: mockSessionId }),
    });

    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(data.error).toBe("Cette séance n'a pas de date");
  });

  it('should return 500 if weather enrichment fails', async () => {
    const mockSession = {
      id: mockSessionId,
      userId: mockUserId,
      date: new Date('2024-01-01'),
      weather: null,
      stravaData: { map: { summary_polyline: 'abc' } },
    };

    const request = createMockRequest();
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(mockSession as never);
    vi.mocked(enrichSessionWithWeather).mockResolvedValue(null);

    const response = await PATCH(request, {
      params: Promise.resolve({ id: mockSessionId }),
    });

    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(data.error).toBe('Impossible de récupérer les données météo pour cette séance');
  });

  it('should successfully enrich session with weather data', async () => {
    const mockWeather = {
      conditionCode: 1,
      temperature: 15.5,
      windSpeed: 10,
      precipitation: 0,
      timestamp: 14,
    };

    const mockSession = {
      id: mockSessionId,
      userId: mockUserId,
      date: new Date('2024-01-01T14:00:00Z'),
      weather: null,
      stravaData: { map: { summary_polyline: 'valid_polyline' } },
    };

    const updatedSession = {
      ...mockSession,
      weather: mockWeather,
    };

    const request = createMockRequest();
    vi.mocked(findSessionByIdAndUser).mockResolvedValue(mockSession as never);
    vi.mocked(enrichSessionWithWeather).mockResolvedValue(mockWeather);
    vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);

    const response = await PATCH(request, {
      params: Promise.resolve({ id: mockSessionId }),
    });

    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(enrichSessionWithWeather).toHaveBeenCalledWith(
      mockSession.stravaData,
      mockSession.date
    );
    expect(prisma.training_sessions.update).toHaveBeenCalledWith({
      where: { id: mockSessionId },
      data: { weather: mockWeather },
    });
    expect(data.weather).toEqual(mockWeather);
  });
});
