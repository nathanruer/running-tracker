import 'server-only';
import { Prisma, type SourceProvider } from '@prisma/client';
import { z } from 'zod';
import { prisma, tenantTransaction } from '@/server/database';
import { createLogger } from '@/server/infrastructure/logger';
import { parseDuration } from '@/lib/utils/duration/parse';
import { formatDuration } from '@/lib/utils/duration/format';
import type { IntervalDetails } from '@/lib/types';
import { streamPayloadSchema, weatherPayloadSchema } from '@/lib/validation/payloads';
import {
  actualsFromSteps,
  familyFromSession,
  intervalDetailsFromV3,
  sessionTypeFromStructure,
} from '@/lib/domain/workouts/structure';
import {
  DEFAULT_TIMEZONE,
  buildStreamsV3,
  buildWorkoutV3,
  polylineOf,
  resolveStartedAt,
  toProvider,
} from './workout-v3';
import { buildPlannedWorkoutFields, type PlannedInput } from './planned-v3';

const logger = createLogger({ context: 'session-write' });

type Tx = Prisma.TransactionClient;

type PlannedRow = {
  family: Prisma.planned_workoutsGetPayload<object>['family'];
  structure: Prisma.JsonValue;
  plannedOn: Date | null;
  targetDurationS: number | null;
  targetDistanceM: number | null;
  targetPaceSKm: number | null;
  targetHrBpm: number | null;
  targetRpe: number | null;
  recommendationId: string | null;
  notes: string;
};

export class DuplicateExternalActivityError extends Error {
  readonly statusCode = 409;

  constructor(externalId: string) {
    super(`Cette activité (${externalId}) est déjà importée.`);
    this.name = 'DuplicateExternalActivityError';
  }
}

function parsePayload<T>(schema: z.ZodType<T>, value: unknown, label: string): T | null {
  if (value == null) return null;
  const result = schema.safeParse(value);
  if (!result.success) {
    logger.warn({ label, issues: result.error.issues }, 'session-payload-invalid');
    return null;
  }
  return result.data;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Family of a session typed by the user (or carried over from its plan). */
function familyFields(
  sessionType: string | null,
  details: IntervalDetails | null,
  source: 'manual' | 'plan'
) {
  const family = familyFromSession(sessionType, details);
  return family
    ? { family, familySource: source, familyConfidence: null, familyEditedAt: source === 'manual' ? new Date() : null }
    : { family: null, familySource: null, familyConfidence: null, familyEditedAt: null };
}

function plannedInput(source: Record<string, unknown>, base?: PlannedInput): PlannedInput {
  const has = (key: string) => source[key] !== undefined;
  return {
    sessionType: has('sessionType') ? (source.sessionType ? String(source.sessionType) : null) : base?.sessionType ?? null,
    intervalDetails: has('intervalDetails') ? ((source.intervalDetails as IntervalDetails | null) ?? null) : base?.intervalDetails ?? null,
    plannedDate: source.plannedDate ? source.plannedDate : base?.plannedDate ?? null,
    targetDuration: has('targetDuration') ? ((source.targetDuration as number | null) ?? null) : base?.targetDuration ?? null,
    targetDistance: has('targetDistance') ? ((source.targetDistance as number | null) ?? null) : base?.targetDistance ?? null,
    targetPace: has('targetPace') ? ((source.targetPace as string | null) ?? null) : base?.targetPace ?? null,
    targetHeartRateBpm: has('targetHeartRateBpm')
      ? ((source.targetHeartRateBpm as string | number | null) ?? null)
      : base?.targetHeartRateBpm ?? null,
    targetRPE: has('targetRPE') ? ((source.targetRPE as number | null) ?? null) : base?.targetRPE ?? null,
    recommendationId: has('recommendationId')
      ? (source.recommendationId ? String(source.recommendationId) : null)
      : base?.recommendationId ?? null,
    comments: has('comments') ? String(source.comments ?? '') : base?.comments ?? '',
  };
}

function plannedInputFromRow(row: PlannedRow): PlannedInput {
  return {
    sessionType: sessionTypeFromStructure(row.family, row.structure),
    intervalDetails: intervalDetailsFromV3(row.structure),
    plannedDate: row.plannedOn,
    targetDuration: row.targetDurationS != null ? Math.round(row.targetDurationS / 60) : null,
    targetDistance: row.targetDistanceM != null ? row.targetDistanceM / 1000 : null,
    targetPace: row.targetPaceSKm != null ? formatDuration(row.targetPaceSKm) : null,
    targetHeartRateBpm: row.targetHrBpm,
    targetRPE: row.targetRpe,
    recommendationId: row.recommendationId,
    comments: row.notes,
  };
}

async function replaceWorkoutIntervals(tx: Tx, workoutId: string, details: IntervalDetails | null) {
  await tx.workout_intervals.deleteMany({ where: { workoutId } });
  const rows = actualsFromSteps(details?.steps);
  if (rows.length) {
    await tx.workout_intervals.createMany({
      data: rows.map((row) => ({ workoutId, ...row, source: 'manual' as const })),
    });
  }
}

export async function recalculateSessionNumbers(userId: string) {
  const [workouts, plans] = await Promise.all([
    prisma.workouts.findMany({
      where: { userId },
      orderBy: [{ startedAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, sessionNumber: true, planned_workout: { select: { id: true, sessionNumber: true } } },
    }),
    prisma.planned_workouts.findMany({
      where: { userId, workoutId: null },
      orderBy: [{ plannedOn: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      select: { id: true, sessionNumber: true },
    }),
  ]);

  const workoutUpdates: Array<{ id: string; sessionNumber: number }> = [];
  const planUpdates: Array<{ id: string; sessionNumber: number }> = [];
  let sessionNumber = 1;

  for (const workout of workouts) {
    if (workout.sessionNumber !== sessionNumber) {
      workoutUpdates.push({ id: workout.id, sessionNumber });
    }
    if (workout.planned_workout && workout.planned_workout.sessionNumber !== sessionNumber) {
      planUpdates.push({ id: workout.planned_workout.id, sessionNumber });
    }
    sessionNumber++;
  }

  for (const plan of plans) {
    if (plan.sessionNumber !== sessionNumber) {
      planUpdates.push({ id: plan.id, sessionNumber });
    }
    sessionNumber++;
  }

  if (workoutUpdates.length || planUpdates.length) {
    await tenantTransaction(async (tx) => {
      for (const update of workoutUpdates) {
        await tx.workouts.update({ where: { id: update.id }, data: { sessionNumber: update.sessionNumber } });
      }
      for (const update of planUpdates) {
        await tx.planned_workouts.update({ where: { id: update.id }, data: { sessionNumber: update.sessionNumber } });
      }
    });
  }
}

async function assertSourceAvailable(
  tx: Tx,
  userId: string,
  provider: SourceProvider | null,
  externalId: string | null,
  currentWorkoutId?: string
) {
  if (!provider || !externalId) return;

  const existing = await tx.workout_sources.findFirst({
    where: { userId, provider, externalId },
    select: { workoutId: true },
  });

  if (existing && existing.workoutId !== currentWorkoutId) {
    throw new DuplicateExternalActivityError(externalId);
  }
}

async function upsertWeatherObservation(tx: Tx, workoutId: string, weather: Record<string, unknown> | null, observedAt: Date) {
  if (!weather) return null;

  const numericField = (key: string) =>
    typeof weather[key] === 'number' ? (weather[key] as number) : null;

  const fields = {
    observedAt,
    temperature: numericField('temperature'),
    apparentTemperature: numericField('apparentTemperature'),
    humidity: numericField('humidity'),
    windSpeed: numericField('windSpeed'),
    precipitation: numericField('precipitation'),
    conditionCode: numericField('conditionCode'),
  };

  const observation = await tx.weather_observations.upsert({
    where: { workoutId },
    update: fields,
    create: { workoutId, ...fields },
  });
  await tx.workout_sources.updateMany({ where: { workoutId }, data: { weatherStatus: 'done' } });
  return observation;
}

async function upsertWorkoutSource(
  tx: Tx,
  workoutId: string,
  userId: string,
  provider: SourceProvider | null,
  externalId: string | null,
  sourcePayload: unknown,
  startedAt: Date,
  routePolyline: string | null
) {
  if (!provider || !externalId) return null;

  const existing = await tx.workout_sources.findFirst({
    where: { userId, provider, externalId },
  });

  if (existing && existing.workoutId !== workoutId) {
    throw new DuplicateExternalActivityError(externalId);
  }

  const payload = asRecord(sourcePayload);
  const fields = {
    startedAt,
    syncedAt: new Date(),
    ...(payload ? { rawPayload: payload as Prisma.InputJsonValue, payloadKind: 'activity' } : {}),
    ...(routePolyline ? { hasRoute: true, routeStatus: 'done' as const } : {}),
  };

  return existing
    ? tx.workout_sources.update({ where: { id: existing.id }, data: fields })
    : tx.workout_sources.create({
        data: {
          workoutId,
          userId,
          provider,
          externalId,
          weatherStatus: routePolyline ? 'pending' : 'not_applicable',
          ...fields,
        },
      });
}

async function replaceStreams(tx: Tx, workoutId: string, streamsPayload: Prisma.JsonValue | null) {
  const streams = asRecord(streamsPayload);
  const streamsV3 = buildStreamsV3(streams);
  if (!streamsV3) return;

  await tx.workout_streams.upsert({
    where: { workoutId },
    update: { ...streamsV3, capturedAt: new Date() },
    create: { workoutId, ...streamsV3 },
  });
  await tx.workout_sources.updateMany({
    where: { workoutId },
    data: { hasStreams: true, streamsStatus: 'done' },
  });
}

export async function updateSessionWeather(
  id: string,
  userId: string,
  weather: Record<string, unknown>
) {
  const sanitizedWeather = parsePayload(weatherPayloadSchema, weather, 'weather');
  if (!sanitizedWeather) return null;

  const workout = await prisma.workouts.findFirst({
    where: { userId, id },
    select: { id: true, startedAt: true },
  });

  if (!workout) return null;

  await tenantTransaction((tx) => upsertWeatherObservation(tx, workout.id, sanitizedWeather, workout.startedAt));
  return workout.id;
}

export async function updateSessionStreams(
  id: string,
  userId: string,
  streams: Record<string, unknown>
) {
  const sanitizedStreams = parsePayload(streamPayloadSchema, streams, 'streams');
  if (!sanitizedStreams) return null;

  const workout = await prisma.workouts.findFirst({
    where: { userId, id },
    select: { id: true },
  });

  if (!workout) return null;

  await tenantTransaction((tx) => replaceStreams(tx, workout.id, sanitizedStreams as Prisma.JsonValue));
  return workout.id;
}

export async function attachRoutePolyline(
  workoutId: string,
  userId: string,
  polyline: string
) {
  const workout = await prisma.workouts.findFirst({
    where: { id: workoutId, userId },
    select: { routePolyline: true },
  });

  if (!workout) return null;

  await tenantTransaction(async (tx) => {
    await tx.workouts.update({
      where: { id: workoutId },
      data: { routePolyline: workout.routePolyline ?? polyline },
    });
    await tx.workout_sources.updateMany({
      where: { workoutId },
      data: { hasRoute: true, routeStatus: 'done' },
    });
  });

  return workoutId;
}

export async function markSessionNoStreams(
  id: string,
  userId: string
) {
  const updated = await prisma.workout_sources.updateMany({
    where: { workoutId: id, userId },
    data: { hasStreams: false, streamsStatus: 'not_applicable' },
  });

  return updated.count > 0 ? id : null;
}

export async function createPlannedSession(
  payload: Record<string, unknown>,
  userId: string,
  options?: { skipRecalculate?: boolean }
) {
  const plan = await prisma.planned_workouts.create({
    data: {
      userId,
      sessionNumber: 0,
      status: 'planned',
      ...buildPlannedWorkoutFields(plannedInput(payload), DEFAULT_TIMEZONE, { completed: false }),
    },
  });

  if (!options?.skipRecalculate) {
    await recalculateSessionNumbers(userId);
  }

  return plan;
}

export async function createCompletedSession(
  payload: Record<string, unknown>,
  userId: string,
  options?: { skipRecalculate?: boolean }
) {
  const sanitizedWeather = parsePayload(weatherPayloadSchema, payload.weather, 'weather');
  const sanitizedStreams = parsePayload(streamPayloadSchema, payload.streams, 'streams');

  const intervalDetails = (payload.intervalDetails as IntervalDetails | null | undefined) ?? null;
  const sessionType = payload.sessionType ? String(payload.sessionType) : null;
  const provider = toProvider((payload.source as string | null) ?? null);
  const externalId = (payload.externalId as string | null) ?? null;
  const workoutV3 = buildWorkoutV3(payload, sanitizedStreams, DEFAULT_TIMEZONE);

  const workout = await tenantTransaction(async (tx) => {
    await assertSourceAvailable(tx, userId, provider, externalId);

    const workout = await tx.workouts.create({
      data: {
        userId,
        sessionNumber: 0,
        notes: String(payload.comments ?? ''),
        rpe: (payload.perceivedExertion as number | null) ?? null,
        ...workoutV3,
        ...familyFields(sessionType, intervalDetails, 'manual'),
      },
    });

    if (intervalDetails) {
      await tx.planned_workouts.create({
        data: {
          userId,
          sessionNumber: 0,
          status: 'completed',
          workoutId: workout.id,
          ...buildPlannedWorkoutFields(plannedInput(payload), DEFAULT_TIMEZONE, { completed: true }),
        },
      });
      await replaceWorkoutIntervals(tx, workout.id, intervalDetails);
    }

    await upsertWorkoutSource(tx, workout.id, userId, provider, externalId, payload.sourcePayload, workoutV3.startedAt, workoutV3.routePolyline);

    await upsertWeatherObservation(
      tx,
      workout.id,
      (sanitizedWeather as Record<string, unknown> | null) ?? null,
      workoutV3.startedAt
    );

    await replaceStreams(tx, workout.id, (sanitizedStreams as Prisma.JsonValue | null) ?? null);

    return workout;
  });

  if (!options?.skipRecalculate) {
    await recalculateSessionNumbers(userId);
  }

  return workout;
}

export async function completePlannedSession(
  planId: string,
  payload: Record<string, unknown>,
  userId: string
) {
  const plan = await prisma.planned_workouts.findFirst({
    where: { userId, id: planId, workoutId: null },
  });

  if (!plan) return null;

  const sanitizedWeather = parsePayload(weatherPayloadSchema, payload.weather, 'weather');
  const sanitizedStreams = parsePayload(streamPayloadSchema, payload.streams, 'streams');
  const provider = toProvider((payload.source as string | null) ?? null);
  const externalId = (payload.externalId as string | null) ?? null;
  const workoutV3 = buildWorkoutV3(payload, sanitizedStreams, plan.timezone);

  const planLabel = sessionTypeFromStructure(plan.family, plan.structure);
  const sessionType = payload.sessionType ? String(payload.sessionType) : planLabel;
  const details = payload.intervalDetails !== undefined
    ? ((payload.intervalDetails as IntervalDetails | null) ?? null)
    : intervalDetailsFromV3(plan.structure);

  const workout = await tenantTransaction(async (tx) => {
    await assertSourceAvailable(tx, userId, provider, externalId);

    const workout = await tx.workouts.create({
      data: {
        id: plan.id,
        userId,
        sessionNumber: 0,
        notes: String(payload.comments ?? plan.notes ?? ''),
        rpe: (payload.perceivedExertion as number | null) ?? null,
        ...workoutV3,
        ...familyFields(sessionType, details, payload.sessionType ? 'manual' : 'plan'),
      },
    });

    await tx.planned_workouts.update({
      where: { id: plan.id },
      data: {
        status: 'completed',
        workoutId: workout.id,
        ...(payload.intervalDetails !== undefined
          ? buildPlannedWorkoutFields(
              plannedInput({ ...payload, sessionType: undefined, comments: undefined }, plannedInputFromRow(plan)),
              plan.timezone,
              { completed: true }
            )
          : {}),
      },
    });

    if (payload.intervalDetails !== undefined) {
      await replaceWorkoutIntervals(tx, workout.id, details);
    }

    await upsertWorkoutSource(tx, workout.id, userId, provider, externalId, payload.sourcePayload, workoutV3.startedAt, workoutV3.routePolyline);

    await upsertWeatherObservation(
      tx,
      workout.id,
      (sanitizedWeather as Record<string, unknown> | null) ?? null,
      workoutV3.startedAt
    );

    await replaceStreams(tx, workout.id, (sanitizedStreams as Prisma.JsonValue | null) ?? null);

    return workout;
  });

  await recalculateSessionNumbers(userId);

  return workout;
}

export async function updateSession(
  id: string,
  updates: Record<string, unknown>,
  userId: string
) {
  const workout = await prisma.workouts.findFirst({
    where: { userId, id },
    include: { planned_workout: true },
  });

  if (workout) {
    const plan = workout.planned_workout;
    const provider = toProvider((updates.source as string | null) ?? null);
    const externalId = (updates.externalId as string | null) ?? null;
    const startChange = updates.date ? resolveStartedAt(updates.date, updates.startedAt, workout.timezone) : null;
    const details = updates.intervalDetails !== undefined
      ? ((updates.intervalDetails as IntervalDetails | null) ?? null)
      : plan
        ? intervalDetailsFromV3(plan.structure)
        : null;

    await tenantTransaction(async (tx) => {
      await tx.workouts.update({
        where: { id: workout.id },
        data: {
          notes: updates.comments !== undefined ? String(updates.comments) : workout.notes,
          rpe: updates.perceivedExertion !== undefined ? (updates.perceivedExertion == null ? null : Number(updates.perceivedExertion)) : workout.rpe,
          ...(updates.sessionType !== undefined
            ? familyFields(updates.sessionType ? String(updates.sessionType) : null, details, 'manual')
            : {}),
          ...(startChange ?? {}),
          ...(updates.routePolyline !== undefined ? { routePolyline: polylineOf(updates.routePolyline) } : {}),
          ...(updates.duration !== undefined ? { durationS: updates.duration ? parseDuration(String(updates.duration)) : null } : {}),
          ...(updates.distance !== undefined ? { distanceM: updates.distance == null ? null : Math.round(Number(updates.distance) * 1000) } : {}),
          ...(updates.avgPace !== undefined ? { paceSKm: updates.avgPace ? parseDuration(String(updates.avgPace)) : null } : {}),
          ...(updates.avgHeartRate !== undefined ? { avgHr: updates.avgHeartRate == null ? null : Math.round(Number(updates.avgHeartRate)) } : {}),
        },
      });

      if (updates.weather) {
        const sanitizedWeather = parsePayload(weatherPayloadSchema, updates.weather, 'weather');
        if (sanitizedWeather) {
          await upsertWeatherObservation(
            tx,
            workout.id,
            sanitizedWeather as Record<string, unknown>,
            startChange?.startedAt ?? workout.startedAt
          );
        }
      }

      if (updates.externalId || updates.source) {
        await assertSourceAvailable(tx, userId, provider, externalId, workout.id);
        await upsertWorkoutSource(
          tx,
          workout.id,
          userId,
          provider,
          externalId,
          updates.sourcePayload,
          startChange?.startedAt ?? workout.startedAt,
          polylineOf(updates.routePolyline) ?? workout.routePolyline
        );
      }

      if (updates.streams) {
        const sanitizedStreams = parsePayload(streamPayloadSchema, updates.streams, 'streams');
        if (sanitizedStreams) {
          await replaceStreams(tx, workout.id, sanitizedStreams as Prisma.JsonValue);
        }
      }

      if (updates.intervalDetails !== undefined) {
        const input = plannedInput(
          { intervalDetails: updates.intervalDetails, sessionType: updates.sessionType },
          plan ? plannedInputFromRow(plan) : undefined
        );
        const fields = buildPlannedWorkoutFields(input, workout.timezone, { completed: true });
        if (plan) {
          await tx.planned_workouts.update({ where: { id: plan.id }, data: fields });
        } else if (details) {
          await tx.planned_workouts.create({
            data: { userId, sessionNumber: workout.sessionNumber ?? 0, status: 'completed', workoutId: workout.id, ...fields },
          });
        }
        await replaceWorkoutIntervals(tx, workout.id, details);
      }
    });

    if (updates.date) {
      await recalculateSessionNumbers(userId);
    }

    return workout;
  }

  const plan = await prisma.planned_workouts.findFirst({
    where: { userId, id, workoutId: null },
  });

  if (!plan) return null;

  await prisma.planned_workouts.update({
    where: { id: plan.id },
    data: buildPlannedWorkoutFields(plannedInput(updates, plannedInputFromRow(plan)), plan.timezone, { completed: false }),
  });

  await recalculateSessionNumbers(userId);

  return plan;
}

export async function deleteSession(id: string, userId: string) {
  const workout = await prisma.workouts.findFirst({
    where: { userId, id },
    select: { id: true },
  });

  if (workout) {
    await tenantTransaction(async (tx) => {
      await tx.planned_workouts.deleteMany({ where: { workoutId: workout.id } });
      await tx.workouts.delete({ where: { id: workout.id } });
    });
  } else {
    await prisma.planned_workouts.deleteMany({ where: { userId, id, workoutId: null } });
  }

  await recalculateSessionNumbers(userId);
}

export async function deleteSessions(ids: string[], userId: string) {
  if (!ids.length) return;

  await tenantTransaction(async (tx) => {
    await tx.planned_workouts.deleteMany({
      where: { userId, OR: [{ id: { in: ids } }, { workoutId: { in: ids } }] },
    });
    await tx.workouts.deleteMany({ where: { userId, id: { in: ids } } });
  });

  await recalculateSessionNumbers(userId);
}

export async function logSessionWriteError(error: unknown, context: Record<string, unknown>) {
  logger.error({ error, ...context }, 'session-write-failed');
}
