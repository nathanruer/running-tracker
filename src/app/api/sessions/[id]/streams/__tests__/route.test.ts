import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';
import { markSessionNoStreams, updateSessionStreams } from '@/server/domain/sessions/sessions-write';
import { fetchStreamsForSessionWithStatus } from '@/server/services/intervals';

vi.mock('@/server/domain/sessions/sessions-read', () => ({
  fetchSessionById: vi.fn(),
}));

vi.mock('@/server/domain/sessions/sessions-write', () => ({
  updateSessionStreams: vi.fn(),
  markSessionNoStreams: vi.fn(),
  logSessionWriteError: vi.fn(),
}));

vi.mock('@/server/services/intervals', () => ({
  fetchStreamsForSessionWithStatus: vi.fn(),
}));

vi.mock('@/server/auth/middleware', () => ({
  requireAuth: vi.fn(() => ({ success: true, userId: 'user-123' })),
}));

const makeRequest = () =>
  new NextRequest('http://localhost/api/sessions/session-1/streams', {
    method: 'PATCH',
  });

describe('/api/sessions/[id]/streams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when session is missing', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue(null);

    const response = await PATCH(makeRequest(), { params: Promise.resolve({ id: 'session-1' }) });

    expect(response.status).toBe(404);
  });

  it('returns already_has_streams when stream payload already exists', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue({
      id: 'session-1',
      source: 'intervals_icu',
      externalId: '123',
      hasStreams: true,
      streams: {
        velocity_smooth: {
          data: [2.5, 2.6],
        },
      },
    } as never);

    const response = await PATCH(makeRequest(), { params: Promise.resolve({ id: 'session-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('already_has_streams');
    expect(fetchStreamsForSessionWithStatus).not.toHaveBeenCalled();
  });

  it('returns no_streams when the source is already flagged as non-fetchable', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue({
      id: 'session-1',
      source: 'intervals_icu',
      externalId: '123',
      hasStreams: true,
      streams: null,
    } as never);

    const response = await PATCH(makeRequest(), { params: Promise.resolve({ id: 'session-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('no_streams');
    expect(markSessionNoStreams).not.toHaveBeenCalled();
    expect(fetchStreamsForSessionWithStatus).not.toHaveBeenCalled();
  });

  it('returns missing_source when no external reference exists', async () => {
    vi.mocked(fetchSessionById).mockResolvedValue({
      id: 'session-1',
      source: null,
      externalId: null,
      hasStreams: false,
      streams: null,
    } as never);

    const response = await PATCH(makeRequest(), { params: Promise.resolve({ id: 'session-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status).toBe('missing_source');
  });

  it('returns no_streams when the provider has no exploitable streams', async () => {
    vi.mocked(fetchSessionById)
      .mockResolvedValueOnce({
        id: 'session-1',
        source: 'intervals_icu',
        externalId: '123',
        hasStreams: false,
        streams: null,
      } as never)
      .mockResolvedValueOnce({
        id: 'session-1',
        source: 'intervals_icu',
        externalId: '123',
        hasStreams: true,
        streams: null,
      } as never);

    vi.mocked(fetchStreamsForSessionWithStatus).mockResolvedValue({
      status: 'no_streams',
      streams: null,
    });

    const response = await PATCH(makeRequest(), { params: Promise.resolve({ id: 'session-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('no_streams');
    expect(markSessionNoStreams).toHaveBeenCalledWith('session-1', 'user-123');
  });

  it('enriches streams and returns updated session', async () => {
    vi.mocked(fetchSessionById)
      .mockResolvedValueOnce({
        id: 'session-1',
        source: 'intervals_icu',
        externalId: '123',
        hasStreams: false,
        streams: null,
      } as never)
      .mockResolvedValueOnce({
        id: 'session-1',
        source: 'intervals_icu',
        externalId: '123',
        hasStreams: true,
        streams: {
          velocity_smooth: {
            data: [2.5, 2.6],
          },
        },
      } as never);

    vi.mocked(fetchStreamsForSessionWithStatus).mockResolvedValue({
      status: 'ok',
      streams: {
        velocity_smooth: {
          data: [2.5, 2.6],
        },
      },
    });
    vi.mocked(updateSessionStreams).mockResolvedValue('session-1');

    const response = await PATCH(makeRequest(), { params: Promise.resolve({ id: 'session-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('enriched');
    expect(fetchStreamsForSessionWithStatus).toHaveBeenCalledWith(
      'intervals_icu',
      '123',
      'user-123',
      'enrich-session-streams'
    );
    expect(updateSessionStreams).toHaveBeenCalled();
  });
});
