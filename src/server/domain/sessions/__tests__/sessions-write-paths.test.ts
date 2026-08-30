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
    planned_workouts: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workout_sources: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    weather_observations: {
      upsert: vi.fn(),
    },
    workout_streams: {
      upsert: vi.fn(),
    },
    workout_intervals: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  };
  return {
    prisma: tables,
    tenantTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tables)),
  };
});

function stubRecalculate() {
  vi.mocked(prisma.workouts.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.planned_workouts.findMany).mockResolvedValue([] as never);
}

const vmaDetails = {
  workoutType: 'VMA',
  repetitionCount: 2,
  effortDuration: '01:00',
  recoveryDuration: '01:00',
  targetEffortPace: '03:45',
  steps: [
    { stepNumber: 1, stepType: 'effort', duration: '01:00', distance: 0.27, pace: '03:42', hr: 176 },
    { stepNumber: 2, stepType: 'recovery', duration: '01:00', distance: 0.15, pace: '06:40', hr: 165 },
  ],
};

describe('sessions-write — write paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRecalculate();
    vi.mocked(prisma.workouts.create).mockResolvedValue({ id: 'w-new', startedAt: new Date('2026-04-30T22:00:00Z') } as never);
    vi.mocked(prisma.planned_workouts.create).mockResolvedValue({ id: 'p-new' } as never);
    vi.mocked(prisma.planned_workouts.update).mockResolvedValue({} as never);
    vi.mocked(prisma.workout_sources.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.workout_sources.create).mockResolvedValue({ id: 'src-1' } as never);
    vi.mocked(prisma.workout_sources.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.weather_observations.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.workout_streams.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.workout_intervals.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.workout_intervals.createMany).mockResolvedValue({ count: 0 } as never);
  });

  describe('createCompletedSession', () => {
    it('creates a workout with day precision at Paris midnight, numeric metrics and a manual family', async () => {
      const workout = await sessionsWrite.createCompletedSession(
        { date: '2026-05-01', sessionType: 'Footing', duration: '45:00', distance: 8, avgPace: '05:37', avgHeartRate: 148, comments: 'ok', perceivedExertion: 4 },
        'user-1'
      );

      expect(workout.id).toBe('w-new');
      expect(prisma.planned_workouts.create).not.toHaveBeenCalled();
      expect(prisma.workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          sessionNumber: 0,
          notes: 'ok',
          rpe: 4,
          startedAt: new Date('2026-04-30T22:00:00Z'),
          timezone: 'Europe/Paris',
          datePrecision: 'day',
          durationS: 2700,
          distanceM: 8000,
          paceSKm: 337,
          avgHr: 148,
          routePolyline: null,
          family: 'footing',
          familySource: 'manual',
        }),
      });
      expect(prisma.workout_sources.create).not.toHaveBeenCalled();
    });

    it('leaves the family empty for imports without a session type', async () => {
      await sessionsWrite.createCompletedSession({ date: '2026-05-01', comments: 'Lunch Run' }, 'user-1');

      expect(prisma.workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ family: null, familySource: null }),
      });
    });

    it('stores the plan and the executed intervals when interval details are present', async () => {
      await sessionsWrite.createCompletedSession(
        { date: '2026-05-01', sessionType: 'Fractionné', intervalDetails: vmaDetails },
        'user-1'
      );

      expect(prisma.workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ family: 'vma_short', familySource: 'manual' }),
      });
      expect(prisma.planned_workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          status: 'completed',
          workoutId: 'w-new',
          family: 'vma_short',
          structure: expect.objectContaining({
            kind: 'interval',
            blocks: [expect.objectContaining({ type: 'repeat', times: 2 })],
          }),
        }),
      });
      expect(prisma.workout_intervals.deleteMany).toHaveBeenCalledWith({ where: { workoutId: 'w-new' } });
      expect(prisma.workout_intervals.createMany).toHaveBeenCalledWith({
        data: [
          { workoutId: 'w-new', position: 1, kind: 'work', movingS: 60, distanceM: 270, paceSKm: 222, avgHr: 176, source: 'manual' },
          { workoutId: 'w-new', position: 2, kind: 'recovery', movingS: 60, distanceM: 150, paceSKm: 400, avgHr: 165, source: 'manual' },
        ],
      });
    });

    it('persists the source, weather and streams of an imported activity with their statuses', async () => {
      await sessionsWrite.createCompletedSession(
        {
          date: '2026-05-01T07:00:00',
          source: 'intervals_icu',
          externalId: 'i42',
          startedAt: '2026-05-01T05:00:00Z',
          maxHeartRate: 182,
          routePolyline: 'poly',
          sourcePayload: { id: 'i42', start_date: '2026-05-01T05:00:00Z' },
          weather: { temperature: 12 },
          streams: { time: { data: [0, 1] }, velocity_smooth: { data: [3, 3.2] }, heartrate: { data: [120, 130] } },
        },
        'user-1'
      );

      expect(prisma.workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startedAt: new Date('2026-05-01T05:00:00Z'),
          datePrecision: 'instant',
          maxHr: 182,
          routePolyline: 'poly',
        }),
      });
      expect(prisma.workout_sources.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workoutId: 'w-new',
          provider: 'intervals_icu',
          externalId: 'i42',
          payloadKind: 'activity',
          hasRoute: true,
          routeStatus: 'done',
          rawPayload: { id: 'i42', start_date: '2026-05-01T05:00:00Z' },
          weatherStatus: 'pending',
        }),
      });
      expect(prisma.weather_observations.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workoutId: 'w-new' },
          create: expect.objectContaining({ workoutId: 'w-new', temperature: 12, observedAt: new Date('2026-05-01T05:00:00Z') }),
        })
      );
      expect(prisma.workout_streams.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workoutId: 'w-new' },
          create: expect.objectContaining({ workoutId: 'w-new', time: [0, 1], velocity: [3, 3.2], sampleCount: 2 }),
        })
      );
      expect(prisma.workout_sources.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { hasStreams: true, streamsStatus: 'done' } })
      );
      expect(prisma.workout_sources.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { weatherStatus: 'done' } })
      );
    });

    it('skips renumbering when skipRecalculate is set', async () => {
      await sessionsWrite.createCompletedSession({ date: '2026-05-01' }, 'user-1', { skipRecalculate: true });

      expect(prisma.workouts.findMany).not.toHaveBeenCalled();
    });

    it('rejects an external id already linked to another workout', async () => {
      vi.mocked(prisma.workout_sources.findFirst).mockResolvedValue({ id: 'src-old', workoutId: 'w-other' } as never);

      await expect(
        sessionsWrite.createCompletedSession(
          { date: '2026-05-01', source: 'intervals_icu', externalId: '123', sourcePayload: { id: 'i123' } },
          'user-1'
        )
      ).rejects.toMatchObject({ name: 'DuplicateExternalActivityError' });

      expect(prisma.workouts.create).not.toHaveBeenCalled();
    });
  });

  describe('createPlannedSession', () => {
    it('creates the planned workout from the legacy payload', async () => {
      vi.mocked(prisma.planned_workouts.create).mockResolvedValue({ id: 'p-9' } as never);

      const plan = await sessionsWrite.createPlannedSession(
        { plannedDate: '2026-09-02', sessionType: 'Sortie longue', targetDuration: 90, targetDistance: 16, comments: 'long' },
        'user-1'
      );

      expect(plan.id).toBe('p-9');
      expect(prisma.planned_workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          plannedOn: new Date('2026-09-02T00:00:00Z'),
          family: 'long',
          targetDurationS: 5400,
          targetDistanceM: 16000,
          origin: 'manual',
          status: 'planned',
          notes: 'long',
        }),
      });
    });
  });

  describe('completePlannedSession', () => {
    const plan = {
      id: 'p-1',
      userId: 'user-1',
      timezone: 'Europe/Paris',
      family: 'vma_short',
      structure: { kind: 'interval', family: 'vma_short', blocks: [{ type: 'repeat', times: 3, blocks: [{ type: 'work', target: { duration_s: 60 } }, { type: 'recovery', target: { duration_s: 60 } }] }] },
      plannedOn: new Date('2026-05-01T00:00:00Z'),
      targetDurationS: 2400,
      targetDistanceM: null,
      targetPaceSKm: null,
      targetHrBpm: null,
      targetRpe: null,
      recommendationId: null,
      notes: 'prévu',
    };

    it('returns null when the plan does not belong to the user', async () => {
      vi.mocked(prisma.planned_workouts.findFirst).mockResolvedValue(null as never);

      const result = await sessionsWrite.completePlannedSession('p-1', { date: '2026-05-01' }, 'user-1');

      expect(result).toBeNull();
      expect(prisma.workouts.create).not.toHaveBeenCalled();
    });

    it('creates the workout reusing the plan id, inherits the family from the plan and links it', async () => {
      vi.mocked(prisma.planned_workouts.findFirst).mockResolvedValue(plan as never);

      await sessionsWrite.completePlannedSession('p-1', { date: '2026-05-01', duration: '40:00' }, 'user-1');

      expect(prisma.workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'p-1', notes: 'prévu', family: 'vma_short', familySource: 'plan', durationS: 2400 }),
      });
      expect(prisma.planned_workouts.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { status: 'completed', workoutId: 'w-new' },
      });
      expect(prisma.workout_intervals.deleteMany).not.toHaveBeenCalled();
    });

    it('stores the executed intervals and refreshes the plan when details are sent', async () => {
      vi.mocked(prisma.planned_workouts.findFirst).mockResolvedValue(plan as never);

      await sessionsWrite.completePlannedSession(
        'p-1',
        { date: '2026-05-01', sessionType: 'Fractionné', intervalDetails: vmaDetails },
        'user-1'
      );

      expect(prisma.workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ family: 'vma_short', familySource: 'manual' }),
      });
      expect(prisma.planned_workouts.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({
          status: 'completed',
          workoutId: 'w-new',
          notes: 'prévu',
          structure: expect.objectContaining({ blocks: [expect.objectContaining({ type: 'repeat', times: 2 })] }),
        }),
      });
      expect(prisma.workout_intervals.createMany).toHaveBeenCalled();
    });
  });

  describe('updateSession', () => {
    const existingWorkout = {
      id: 'w-1',
      userId: 'user-1',
      startedAt: new Date('2026-03-31T22:00:00Z'),
      timezone: 'Europe/Paris',
      datePrecision: 'day',
      sessionNumber: 3,
      notes: 'ancien commentaire',
      rpe: 5,
      family: 'footing',
      planned_workout: null,
    };

    it('updates notes and numeric metrics', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(existingWorkout as never);
      vi.mocked(prisma.workouts.update).mockResolvedValue({} as never);

      await sessionsWrite.updateSession('w-1', { comments: 'nouveau', avgPace: '05:30', distance: 9 }, 'user-1');

      expect(prisma.workouts.update).toHaveBeenCalledWith({
        where: { id: 'w-1' },
        data: expect.objectContaining({ notes: 'nouveau', paceSKm: 330, distanceM: 9000, rpe: 5 }),
      });
    });

    it('reclassifies the family when the session type changes', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(existingWorkout as never);
      vi.mocked(prisma.workouts.update).mockResolvedValue({} as never);

      await sessionsWrite.updateSession('w-1', { sessionType: 'Sortie longue' }, 'user-1');

      expect(prisma.workouts.update).toHaveBeenCalledWith({
        where: { id: 'w-1' },
        data: expect.objectContaining({ family: 'long', familySource: 'manual' }),
      });
    });

    it('re-resolves the start instant and renumbers only when the date changes', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(existingWorkout as never);
      vi.mocked(prisma.workouts.update).mockResolvedValue({} as never);

      await sessionsWrite.updateSession('w-1', { comments: 'x' }, 'user-1');
      expect(prisma.workouts.findMany).not.toHaveBeenCalled();

      await sessionsWrite.updateSession('w-1', { date: '2026-04-02' }, 'user-1');
      expect(prisma.workouts.update).toHaveBeenLastCalledWith({
        where: { id: 'w-1' },
        data: expect.objectContaining({ startedAt: new Date('2026-04-01T22:00:00Z'), datePrecision: 'day' }),
      });
      expect(prisma.workouts.findMany).toHaveBeenCalled();
    });

    it('creates the plan of a workout that gets interval details for the first time', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(existingWorkout as never);
      vi.mocked(prisma.workouts.update).mockResolvedValue({} as never);

      await sessionsWrite.updateSession('w-1', { sessionType: 'Fractionné', intervalDetails: vmaDetails }, 'user-1');

      expect(prisma.planned_workouts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-1', workoutId: 'w-1', status: 'completed', family: 'vma_short', sessionNumber: 3 }),
      });
      expect(prisma.workout_intervals.createMany).toHaveBeenCalled();
    });

    it('falls back to updating a plan when no workout matches', async () => {
      vi.mocked(prisma.workouts.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.planned_workouts.findFirst).mockResolvedValue(
        {
          id: 'p-1', userId: 'user-1', timezone: 'Europe/Paris', family: 'footing',
          structure: { kind: 'continuous', family: 'footing', blocks: [] },
          plannedOn: null, targetDurationS: 2700, targetDistanceM: null, targetPaceSKm: null, targetHrBpm: null, targetRpe: null,
          recommendationId: null, notes: '',
        } as never
      );

      const result = await sessionsWrite.updateSession('p-1', { targetDistance: 10 }, 'user-1');

      expect(result).toMatchObject({ id: 'p-1' });
      expect(prisma.planned_workouts.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({ family: 'footing', targetDurationS: 2700, targetDistanceM: 10000 }),
      });
    });
  });
});
