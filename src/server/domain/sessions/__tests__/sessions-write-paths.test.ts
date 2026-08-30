import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionsWrite from '@/server/domain/sessions/sessions-write';
import { prisma } from '@/server/database';

vi.mock('@/server/database', () => {
  const tables = {
    workouts: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    plan_sessions: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workout_metrics_raw: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    external_activities: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    workout_streams_v3: {
      upsert: vi.fn(),
    },
    planned_workouts: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    workout_intervals: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    external_payloads: {
      upsert: vi.fn(),
    },
    weather_observations: {
      upsert: vi.fn(),
    },
    workout_streams: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    workout_stream_chunks: {
      create: vi.fn(),
    },
  };
  return {
    prisma: {
      ...tables,
      $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => Promise<unknown>)({ ...tables, $transaction: vi.fn() });
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    },
  };
});

function stubRecalculate() {
  vi.mocked(prisma.workouts.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.plan_sessions.findMany).mockResolvedValue([] as never);
}

describe('sessions-write — write paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRecalculate();
    vi.mocked(prisma.workouts.create).mockResolvedValue({ id: 'w-new', date: new Date('2026-05-01') } as never);
    vi.mocked(prisma.plan_sessions.create).mockResolvedValue({ id: 'p-new' } as never);
    vi.mocked(prisma.workout_metrics_raw.create).mockResolvedValue({} as never);
    vi.mocked(prisma.workout_metrics_raw.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.external_activities.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.external_activities.create).mockResolvedValue({ id: 'ext-1' } as never);
    vi.mocked(prisma.external_payloads.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.weather_observations.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.workout_streams.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.workout_streams.create).mockResolvedValue({ id: 'stream-1' } as never);
    vi.mocked(prisma.workout_stream_chunks.create).mockResolvedValue({} as never);
    vi.mocked(prisma.workout_streams_v3.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.external_activities.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.planned_workouts.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.planned_workouts.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.workout_intervals.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.workout_intervals.createMany).mockResolvedValue({ count: 0 } as never);
  });

  describe('createCompletedSession', () => {
    it('creates workout + metrics without a plan when no intervalDetails', async () => {
      const workout = await sessionsWrite.createCompletedSession(
        { date: '2026-05-01', sessionType: 'Footing', duration: '45:00', distance: 8 },
        'user-1'
      );

      expect(workout.id).toBe('w-new');
      expect(prisma.plan_sessions.create).not.toHaveBeenCalled();
      expect(prisma.workouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', status: 'completed', planSessionId: null }),
        })
      );
      expect(prisma.workout_metrics_raw.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ workoutId: 'w-new', durationSeconds: 2700, distanceMeters: 8000 }),
        })
      );
    });

    it('writes v3 columns: day precision at Paris midnight and numeric metrics', async () => {
      await sessionsWrite.createCompletedSession(
        { date: '2026-05-01', duration: '45:00', distance: 8, avgPace: '05:37', avgHeartRate: 148 },
        'user-1'
      );

      expect(prisma.workouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startedAt: new Date('2026-04-30T22:00:00Z'),
            timezone: 'Europe/Paris',
            datePrecision: 'day',
            durationS: 2700,
            distanceM: 8000,
            paceSKm: 337,
            avgHr: 148,
            routePolyline: null,
          }),
        })
      );
    });

    it('creates a completed plan and links the workout when intervalDetails present', async () => {
      await sessionsWrite.createCompletedSession(
        { date: '2026-05-01', sessionType: 'Fractionné', intervalDetails: { workoutType: 'VMA' } },
        'user-1'
      );

      expect(prisma.plan_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) })
      );
      expect(prisma.workouts.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ planSessionId: 'p-new' }) })
      );
    });

    it('persists external activity, payload, weather and streams when provided', async () => {
      await sessionsWrite.createCompletedSession(
        {
          date: '2026-05-01',
          source: 'strava',
          externalId: '123',
          stravaData: { id: 123, name: 'Morning Run' },
          weather: { temperature: 12 },
          stravaStreams: { heartrate: { data: [120, 130], series_type: 'distance' } },
        },
        'user-1'
      );

      expect(prisma.external_activities.create).toHaveBeenCalled();
      expect(prisma.external_payloads.upsert).toHaveBeenCalled();
      expect(prisma.weather_observations.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workoutId: 'w-new' } })
      );
      expect(prisma.workout_streams.deleteMany).toHaveBeenCalledWith({ where: { workoutId: 'w-new' } });
      expect(prisma.workout_streams.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ streamType: 'heartrate' }) })
      );
      expect(prisma.workout_stream_chunks.create).toHaveBeenCalled();
    });

    it('writes v3 external fields, streams table and enrichment statuses for an imported activity', async () => {
      await sessionsWrite.createCompletedSession(
        {
          date: '2026-05-01T07:00:00',
          source: 'intervals_icu',
          externalId: 'i42',
          stravaData: {
            id: 42,
            start_date: '2026-05-01T05:00:00Z',
            start_latlng: [48.8, 2.3],
            max_heartrate: 182,
            map: { id: 'intervals_i42', summary_polyline: 'poly' },
          },
          weather: { temperature: 12 },
          stravaStreams: { time: { data: [0, 1] }, velocity_smooth: { data: [3, 3.2] }, heartrate: { data: [120, 130] } },
        },
        'user-1'
      );

      expect(prisma.workouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startedAt: new Date('2026-05-01T05:00:00Z'),
            datePrecision: 'instant',
            maxHr: 182,
            routePolyline: 'poly',
          }),
        })
      );
      expect(prisma.external_activities.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: 'intervals_icu',
            payloadKind: 'detail',
            hasRoute: true,
            routeStatus: 'done',
            streamsStatus: 'pending',
            weatherStatus: 'pending',
          }),
        })
      );
      expect(prisma.workout_streams_v3.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workoutId: 'w-new' },
          create: expect.objectContaining({ workoutId: 'w-new', time: [0, 1], velocity: [3, 3.2], sampleCount: 2 }),
        })
      );
      expect(prisma.external_activities.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { hasStreams: true, streamsStatus: 'done' } })
      );
      expect(prisma.external_activities.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { weatherStatus: 'done' } })
      );
    });

    it('mirrors the plan into planned_workouts and stores steps as actual intervals', async () => {
      await sessionsWrite.createCompletedSession(
        {
          date: '2026-05-01',
          sessionType: 'Fractionné',
          intervalDetails: {
            workoutType: 'VMA',
            repetitionCount: 2,
            effortDuration: '01:00',
            recoveryDuration: '01:00',
            targetEffortPace: '03:45',
            steps: [
              { stepNumber: 1, stepType: 'effort', duration: '01:00', distance: 0.27, pace: '03:42', hr: 176 },
              { stepNumber: 2, stepType: 'recovery', duration: '01:00', distance: 0.15, pace: '06:40', hr: 165 },
            ],
          },
        },
        'user-1'
      );

      expect(prisma.planned_workouts.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-new' },
          create: expect.objectContaining({
            id: 'p-new',
            legacyPlanSessionId: 'p-new',
            family: 'vma_short',
            status: 'completed',
            workoutId: 'w-new',
            structure: expect.objectContaining({
              kind: 'interval',
              blocks: [
                expect.objectContaining({ type: 'repeat', times: 2 }),
              ],
            }),
          }),
        })
      );
      expect(prisma.workout_intervals.deleteMany).toHaveBeenCalledWith({ where: { workoutId: 'w-new' } });
      expect(prisma.workout_intervals.createMany).toHaveBeenCalledWith({
        data: [
          { workoutId: 'w-new', position: 1, kind: 'work', movingS: 60, distanceM: 270, paceSKm: 222, avgHr: 176, source: 'manual' },
          { workoutId: 'w-new', position: 2, kind: 'recovery', movingS: 60, distanceM: 150, paceSKm: 400, avgHr: 165, source: 'manual' },
        ],
      });
    });

    it('skips renumbering when skipRecalculate is set', async () => {
      await sessionsWrite.createCompletedSession(
        { date: '2026-05-01' },
        'user-1',
        { skipRecalculate: true }
      );

      expect(prisma.workouts.findMany).not.toHaveBeenCalled();
    });

    it('rejects a duplicate externalId already linked to another workout', async () => {
      vi.mocked(prisma.external_activities.findFirst).mockResolvedValue(
        { id: 'ext-old', workoutId: 'w-other' } as never
      );

      await expect(
        sessionsWrite.createCompletedSession(
          { date: '2026-05-01', source: 'strava', externalId: '123', stravaData: { id: 123 } },
          'user-1'
        )
      ).rejects.toMatchObject({ name: 'DuplicateExternalActivityError' });

      expect(prisma.workouts.create).not.toHaveBeenCalled();
    });
  });

  describe('createPlannedSession', () => {
    it('creates the legacy plan and its planned_workouts mirror in one transaction', async () => {
      vi.mocked(prisma.plan_sessions.create).mockResolvedValue({ id: 'p-9' } as never);

      const plan = await sessionsWrite.createPlannedSession(
        { plannedDate: '2026-09-02', sessionType: 'Sortie longue', targetDuration: 90, targetDistance: 16, comments: 'long' },
        'user-1'
      );

      expect(plan.id).toBe('p-9');
      expect(prisma.planned_workouts.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-9' },
          create: expect.objectContaining({
            userId: 'user-1',
            plannedOn: new Date('2026-09-02T00:00:00Z'),
            family: 'long',
            targetDurationS: 5400,
            targetDistanceM: 16000,
            origin: 'manual',
            status: 'planned',
            workoutId: null,
            notes: 'long',
          }),
        })
      );
    });
  });

  describe('completePlannedSession', () => {
    it('returns null when the plan does not belong to the user', async () => {
      vi.mocked(prisma.plan_sessions.findFirst).mockResolvedValue(null as never);

      const result = await sessionsWrite.completePlannedSession('p-1', { date: '2026-05-01' }, 'user-1');

      expect(result).toBeNull();
      expect(prisma.workouts.create).not.toHaveBeenCalled();
    });

    it('creates the workout reusing the plan id and marks the plan completed', async () => {
      vi.mocked(prisma.plan_sessions.findFirst).mockResolvedValue(
        { id: 'p-1', sessionType: 'Footing', comments: 'prévu' } as never
      );
      vi.mocked(prisma.plan_sessions.update).mockResolvedValue({} as never);

      await sessionsWrite.completePlannedSession('p-1', { date: '2026-05-01' }, 'user-1');

      expect(prisma.workouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'p-1', planSessionId: 'p-1', status: 'completed' }),
        })
      );
      expect(prisma.plan_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p-1' }, data: expect.objectContaining({ status: 'completed' }) })
      );
    });
  });

  describe('updateSession', () => {
    const existingWorkout = {
      id: 'w-1',
      userId: 'user-1',
      date: new Date('2026-04-01'),
      timezone: 'Europe/Paris',
      sessionType: 'Footing',
      comments: 'ancien commentaire',
      perceivedExertion: 5,
      planSessionId: null,
    };

    it('updates workout fields and upserts metrics', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(existingWorkout as never);
      vi.mocked(prisma.workouts.update).mockResolvedValue({} as never);

      await sessionsWrite.updateSession('w-1', { comments: 'nouveau', avgPace: '05:30' }, 'user-1');

      expect(prisma.workouts.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ comments: 'nouveau', paceSKm: 330 }) })
      );
      expect(prisma.workout_metrics_raw.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ avgPace: '05:30' }) })
      );
    });

    it('re-resolves the v3 start instant when the date changes', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(existingWorkout as never);
      vi.mocked(prisma.workouts.update).mockResolvedValue({} as never);

      await sessionsWrite.updateSession('w-1', { date: '2026-04-02' }, 'user-1');

      expect(prisma.workouts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date: new Date('2026-04-02'),
            startedAt: new Date('2026-04-01T22:00:00Z'),
            datePrecision: 'day',
          }),
        })
      );
    });

    it('clears comments when an empty string is sent', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(existingWorkout as never);
      vi.mocked(prisma.workouts.update).mockResolvedValue({} as never);

      await sessionsWrite.updateSession('w-1', { comments: '' }, 'user-1');

      expect(prisma.workouts.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ comments: '' }) })
      );
    });

    it('renumbers only when the date changes', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(existingWorkout as never);
      vi.mocked(prisma.workouts.update).mockResolvedValue({} as never);

      await sessionsWrite.updateSession('w-1', { comments: 'x' }, 'user-1');
      expect(prisma.workouts.findMany).not.toHaveBeenCalled();

      await sessionsWrite.updateSession('w-1', { date: '2026-04-02' }, 'user-1');
      expect(prisma.workouts.findMany).toHaveBeenCalled();
    });

    it('falls back to updating a plan when no workout matches', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.plan_sessions.findFirst).mockResolvedValue(
        { id: 'p-1', sessionType: 'Footing', comments: '', plannedDate: null, targetDuration: null, targetDistance: null, targetPace: null, targetHeartRateBpm: null, targetRPE: null, intervalDetails: null, recommendationId: null } as never
      );
      vi.mocked(prisma.plan_sessions.update).mockResolvedValue({} as never);

      const result = await sessionsWrite.updateSession('p-1', { targetDistance: 10 }, 'user-1');

      expect(result).toMatchObject({ id: 'p-1' });
      expect(prisma.plan_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ targetDistance: 10 }) })
      );
    });
  });
});
