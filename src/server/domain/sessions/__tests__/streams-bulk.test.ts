import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkEnrichStreamsForIds } from '@/server/domain/sessions/streams-bulk';
import { prisma } from '@/server/database';
import { fetchStreamsForSessionWithStatus } from '@/server/services/strava';
import { markSessionNoStreams, updateSessionStreams } from '@/server/domain/sessions/sessions-write';

vi.mock('@/server/database', () => ({
  prisma: {
    workouts: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/server/services/strava', () => ({
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

  it('classifies not found, already enriched, no_streams marker and missing strava', async () => {
    vi.mocked(prisma.workouts.findMany).mockResolvedValue([
      {
        id: 'a',
        _count: { workout_streams: 1 },
        external_activities: [],
      },
      {
        id: 'b',
        _count: { workout_streams: 0 },
        external_activities: [{ source: 'strava', externalId: '111', sourceStatus: 'no_streams' }],
      },
      {
        id: 'c',
        _count: { workout_streams: 0 },
        external_activities: [
          {
            source: 'strava',
            externalId: '112',
            sourceStatus: 'imported',
            external_payloads: {
              payload: { external_id: null, upload_id: null },
            },
          },
        ],
      },
      {
        id: 'd',
        _count: { workout_streams: 0 },
        external_activities: [],
      },
    ] as never);

    const result = await bulkEnrichStreamsForIds('user-1', ['a', 'b', 'c', 'd', 'e']);

    expect(result.summary.requested).toBe(5);
    expect(result.summary.alreadyHasStreams).toBe(3);
    expect(result.summary.missingStrava).toBe(1);
    expect(result.summary.notFound).toBe(1);
    expect(result.ids.alreadyHasStreams.sort()).toEqual(['a', 'b', 'c']);
    expect(result.ids.missingStrava).toEqual(['d']);
    expect(result.ids.notFound).toEqual(['e']);
    expect(markSessionNoStreams).toHaveBeenCalledWith('c', 'user-1');
    expect(fetchStreamsForSessionWithStatus).not.toHaveBeenCalled();
  });

  it('enriches eligible strava workouts', async () => {
    vi.mocked(prisma.workouts.findMany).mockResolvedValue([
      {
        id: 'a',
        _count: { workout_streams: 0 },
        external_activities: [{ source: 'strava', externalId: '111', sourceStatus: 'imported' }],
      },
    ] as never);

    vi.mocked(fetchStreamsForSessionWithStatus).mockResolvedValue({
      status: 'ok',
      streams: {
        velocity_smooth: {
          data: [1, 2],
          series_type: 'distance',
          original_size: 2,
          resolution: 'high',
        },
      },
    });
    vi.mocked(updateSessionStreams).mockResolvedValue('a');

    const result = await bulkEnrichStreamsForIds('user-1', ['a']);

    expect(result.summary.enriched).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(fetchStreamsForSessionWithStatus).toHaveBeenCalledWith(
      'strava',
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
        _count: { workout_streams: 0 },
        external_activities: [{ source: 'strava', externalId: '111', sourceStatus: 'imported' }],
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
        _count: { workout_streams: 0 },
        external_activities: [{ source: 'strava', externalId: '111', sourceStatus: 'imported' }],
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
        _count: { workout_streams: 1 },
        external_activities: [],
      },
    ] as never);

    const result = await bulkEnrichStreamsForIds('user-1', ['a', 'a']);

    expect(result.summary.requested).toBe(1);
    expect(prisma.workouts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', id: { in: ['a'] } } })
    );
  });
});
