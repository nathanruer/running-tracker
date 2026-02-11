import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../weather/bulk/route';
import { bulkEnrichWeatherForIds } from '@/server/domain/sessions/weather-bulk';

vi.mock('@/server/domain/sessions/weather-bulk', () => ({
  bulkEnrichWeatherForIds: vi.fn(),
}));

vi.mock('@/server/auth/middleware', () => ({
  requireAuth: vi.fn(() => ({ success: true, userId: 'user-123' })),
}));

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/sessions/weather/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('/api/sessions/weather/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when ids are missing', async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it('enqueues jobs and returns summary', async () => {
    vi.mocked(bulkEnrichWeatherForIds).mockResolvedValue({
      summary: {
        requested: 2,
        enriched: 1,
        alreadyHasWeather: 0,
        missingStrava: 1,
        failed: 0,
        notFound: 0,
      },
      ids: {
        enriched: ['a'],
        alreadyHasWeather: [],
        missingStrava: ['b'],
        failed: [],
        notFound: [],
      },
    } as never);

    const response = await POST(makeRequest({ ids: ['a', 'b'] }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.enriched).toBe(1);
    expect(bulkEnrichWeatherForIds).toHaveBeenCalledWith('user-123', ['a', 'b']);
  });
});
