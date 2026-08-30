import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkEnrichStreamsForIds } from '@/server/domain/sessions/streams-bulk';
import { prisma } from '@/server/database';
import { fetchStreamsForSessionWithStatus } from '@/server/services/intervals';
import { markSessionNoStreams, updateSessionStreams } from '@/server/domain/sessions/sessions-write';

vi.mock('@/server/database', () => ({
  prisma: {
    workouts: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/server/services/intervals', () => ({
  fetchStreamsForSessionWithStatus: vi.fn(),
}));

vi.mock('@/server/domain/sessions/sessions-write', () => ({
  markSessionNoStreams: vi.fn(),
  updateSessionStreams: vi.fn(),
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe('bulkEnrichStreamsForIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty summary when ids are empty', async () => {
    const result = await bulkEnrichStreamsForIds('user-1', []);

    expect(result.summary.requested).toBe(0);
    expect(prisma.workouts.findMany).not.toHaveBeenCalled();
  });

  it('classifies not found, already enriched and missing source', async () => {
    vi.mocked(prisma.workouts.findMany).mockResolvedValue([
      {
        id: 'a',
        routePolyline: 'abc',
        workout_streams: { workoutId: 'a' },
        workout_sources: [],
      },
      {
        id: 'b',
        routePolyline: null,
        workout_streams: null,
        workout_sources: [{ provider: 'intervals_icu', externalId: '111', streamsStatus: 'not_applicable' }],
      },
      {
        id: 'd',
        routePolyline: null,
        workout_streams: null,
        workout_sources: [],
      },
    ] as never);

    const result = await bulkEnrichStreamsForIds('user-1', ['a', 'b', 'd', 'e']);

    expect(result.summary.requested).toBe(4);
    expect(result.summary.alreadyHasStreams).toBe(2);
    expect(result.summary.missingSource).toBe(1);
    expect(result.summary.notFound).toBe(1);
    expect(result.ids.alreadyHasStreams.sort()).toEqual(['a', 'b']);
    expect(result.ids.missingSource).toEqual(['d']);
    expect(result.ids.notFound).toEqual(['e']);
    expect(fetchStreamsForSessionWithStatus).not.toHaveBeenCalled();
  });

  it('enriches eligible workouts', async () => {
    vi.mocked(prisma.workouts.findMany).mockResolvedValue([
      {
        id: 'a',
        routePolyline: null,
        workout_streams: null,
        workout_sources: [{ provider: 'intervals_icu', externalId: '111', streamsStatus: 'pending', rawPayload: { id: 111 } }],
      },
    ] as never);

    vi.mocked(fetchStreamsForSessionWithStatus).mockResolvedValue({
      status: 'ok',
      streams: {
        velocity_smooth: {
          data: [1, 2],
        },
      },
    });
    vi.mocked(updateSessionStreams).mockResolvedValue('a');

    const result = await bulkEnrichStreamsForIds('user-1', ['a']);

    expect(result.summary.enriched).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(fetchStreamsForSessionWithStatus).toHaveBeenCalledWith(
      'intervals_icu',
      '111',
      'user-1',
      'bulk-enrich-streams'
    );
    expect(updateSessionStreams).toHaveBeenCalledWith('a', 'user-1', expect.any(Object));
  });

  it('marks no_streams responses and skips failure', async () => {
    vi.mocked(prisma.workouts.findMany).mockResolvedValue([
      {
        id: 'a',
        routePolyline: null,
        workout_streams: null,
        workout_sources: [{ provider: 'intervals_icu', externalId: '111', streamsStatus: 'pending', rawPayload: { id: 111 } }],
      },
    ] as never);

    vi.mocked(fetchStreamsForSessionWithStatus).mockResolvedValue({
      status: 'no_streams',
      streams: null,
    });

    const result = await bulkEnrichStreamsForIds('user-1', ['a']);

    expect(markSessionNoStreams).toHaveBeenCalledWith('a', 'user-1');
    expect(result.summary.alreadyHasStreams).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(result.ids.alreadyHasStreams).toEqual(['a']);
  });

  it('marks failed when fetch status is not ok', async () => {
    vi.mocked(prisma.workouts.findMany).mockResolvedValue([
      {
        id: 'a',
        routePolyline: null,
        workout_streams: null,
        workout_sources: [{ provider: 'intervals_icu', externalId: '111', streamsStatus: 'pending', rawPayload: { id: 111 } }],
      },
    ] as never);

    vi.mocked(fetchStreamsForSessionWithStatus).mockResolvedValue({
      status: 'error',
      streams: null,
    });

    const result = await bulkEnrichStreamsForIds('user-1', ['a']);

    expect(result.summary.failed).toBe(1);
    expect(result.ids.failed).toEqual(['a']);
  });

  it('deduplicates input ids', async () => {
    vi.mocked(prisma.workouts.findMany).mockResolvedValue([
      {
        id: 'a',
        routePolyline: 'abc',
        workout_streams: { workoutId: 'a' },
        workout_sources: [],
      },
    ] as never);

    const result = await bulkEnrichStreamsForIds('user-1', ['a', 'a']);

    expect(result.summary.requested).toBe(1);
    expect(prisma.workouts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', id: { in: ['a'] } } })
    );
  });
});
