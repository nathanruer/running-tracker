import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import {
  getIntervalsApiKey,
  getIntervalsActivityIntervals,
} from '@/server/services/intervals';

vi.mock('@/server/services/intervals', () => ({
  getIntervalsApiKey: vi.fn(),
  getIntervalsActivityIntervals: vi.fn(),
  detectSessionStructure: vi.fn(() => ({ sessionType: 'Fractionné', intervalDetails: { workoutType: 'TEMPO' } })),
}));

vi.mock('@/server/auth/middleware', () => ({
  requireAuth: vi.fn(() => ({ success: true, userId: 'user-123' })),
}));

const makeRequest = () =>
  new NextRequest('http://localhost/api/intervals/activities/i1/structure');

const params = Promise.resolve({ id: 'i1' });

describe('/api/intervals/activities/[id]/structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the structure detected on the activity', async () => {
    vi.mocked(getIntervalsApiKey).mockResolvedValue('key');
    vi.mocked(getIntervalsActivityIntervals).mockResolvedValue([]);

    const response = await GET(makeRequest(), { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ sessionType: 'Fractionné', intervalDetails: { workoutType: 'TEMPO' } });
    expect(getIntervalsActivityIntervals).toHaveBeenCalledWith('key', 'i1');
  });

  it('asks the athlete to connect intervals.icu when no key is stored', async () => {
    vi.mocked(getIntervalsApiKey).mockResolvedValue(null);

    const response = await GET(makeRequest(), { params });

    expect(response.status).toBe(400);
    expect(getIntervalsActivityIntervals).not.toHaveBeenCalled();
  });
});
