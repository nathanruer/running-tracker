import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../streams/bulk/route';
import { bulkEnrichStreamsForIds } from '@/server/domain/sessions/streams-bulk';

vi.mock('@/server/domain/sessions/streams-bulk', () => ({
  bulkEnrichStreamsForIds: vi.fn(),
}));

vi.mock('@/server/auth/middleware', () => ({
  requireAuth: vi.fn(() => ({ success: true, userId: 'user-123' })),
}));

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/sessions/streams/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('/api/sessions/streams/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when ids are missing', async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it('returns summary for bulk streams enrichment', async () => {
    vi.mocked(bulkEnrichStreamsForIds).mockResolvedValue({
      summary: {
        requested: 2,
        enriched: 1,
        alreadyHasStreams: 0,
        missingStrava: 1,
        failed: 0,
        notFound: 0,
      },
      ids: {
        enriched: ['a'],
        alreadyHasStreams: [],
        missingStrava: ['b'],
        failed: [],
        notFound: [],
      },
    } as never);

    const response = await POST(makeRequest({ ids: ['a', 'b'] }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.enriched).toBe(1);
    expect(bulkEnrichStreamsForIds).toHaveBeenCalledWith('user-123', ['a', 'b']);
  });
});
