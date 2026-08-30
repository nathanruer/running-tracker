import 'server-only';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/server/database';
import { createLogger } from '@/server/infrastructure/logger';
import { parseDuration } from '@/lib/utils/duration/parse';
import {
  stravaPayloadSchema,
  stravaStreamPayloadSchema,
  weatherPayloadSchema,
} from '@/lib/validation/payloads';
import type { IntervalDetails } from '@/lib/types';
import { actualsFromSteps } from '@/lib/domain/workouts/structure';
import { isStravaActivityLikelyStreamless } from './stream-eligibility';
import { buildPlannedWorkoutFields, type PlannedInput } from './planned-v3';
import {
  DEFAULT_TIMEZONE,
  buildStreamsV3,
  buildWorkoutV3,
  payloadKindOf,
  resolveStartedAt,
  routePolylineFromActivity,
  toProvider,
} from './workout-v3';

const logger = createLogger({ context: 'session-write' });

type Tx = Prisma.TransactionClient;

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

function plannedInputFromPlan(plan: {
  sessionType: string | null;
  intervalDetails: Prisma.JsonValue | null;
  plannedDate: Date | null;
  targetDuration: number | null;
  targetDistance: number | null;
  targetPace: string | null;
  targetHeartRateBpm: string | null;
  targetRPE: number | null;
  recommendationId: string | null;
  comments: string;
}): PlannedInput {
  return {
    sessionType: plan.sessionType,
    intervalDetails: plan.intervalDetails as IntervalDetails | null,
    plannedDate: plan.plannedDate,
    targetDuration: plan.targetDuration,
    targetDistance: plan.targetDistance,
    targetPace: plan.targetPace,
    targetHeartRateBpm: plan.targetHeartRateBpm,
    targetRPE: plan.targetRPE,
    recommendationId: plan.recommendationId,
    comments: plan.comments,
  };
}

async function upsertPlannedWorkout(
  tx: Tx,
  planId: string,
  userId: string,
  input: PlannedInput,
  link: { status: 'planned' | 'completed'; workoutId: string | null }
) {
  const fields = buildPlannedWorkoutFields(input, DEFAULT_TIMEZONE, { completed: link.status === 'completed' });
  await tx.planned_workouts.upsert({
    where: { id: planId },
    update: { ...fields, ...link },
    create: { id: planId, userId, legacyPlanSessionId: planId, sessionNumber: 0, ...fields, ...link },
  });
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

function getWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

function computeWeek(date: Date, sortedWeekKeys: string[]): number {
  const weekKey = getWeekKey(date);
  const index = sortedWeekKeys.indexOf(weekKey);
  return index === -1 ? sortedWeekKeys.length + 1 : index + 1;
}

export async function recalculateSessionNumbers(userId: string) {
  const workouts = await prisma.workouts.findMany({
    where: { userId },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, date: true, planSessionId: true, sessionNumber: true, week: true },
  });

  const unlinkedPlans = await prisma.plan_sessions.findMany({
    where: { userId, workouts: { none: {} } },
    orderBy: [{ plannedDate: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, plannedDate: true, sessionNumber: true, week: true },
  });

  const linkedPlans = await prisma.plan_sessions.findMany({
    where: { userId, workouts: { some: {} } },
    select: { id: true, sessionNumber: true },
  });

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  let sessionNumber = 1;

  const planToWorkoutNumber = new Map<string, number>();

  const weekMap = new Map<string, typeof workouts>();
  for (const workout of workouts) {
    const weekKey = getWeekKey(workout.date);
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
    weekMap.get(weekKey)!.push(workout);
  }

  const sortedWeekKeys = Array.from(weekMap.keys()).sort();

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (let weekIndex = 0; weekIndex < sortedWeeks.length; weekIndex++) {
    const [, weekWorkouts] = sortedWeeks[weekIndex];
    const trainingWeek = weekIndex + 1;
    weekWorkouts.sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const workout of weekWorkouts) {
      if (workout.sessionNumber !== sessionNumber || workout.week !== trainingWeek) {
        updates.push(
          prisma.workouts.update({
            where: { id: workout.id },
            data: { sessionNumber, week: trainingWeek },
          })
        );
      }
      if (workout.planSessionId) {
        planToWorkoutNumber.set(workout.planSessionId, sessionNumber);
      }
      sessionNumber++;
    }
  }

  const plansWithDate = unlinkedPlans.filter((p) => p.plannedDate !== null);
  const plansWithoutDate = unlinkedPlans.filter((p) => p.plannedDate === null);

  for (const plan of plansWithDate) {
    const week = computeWeek(plan.plannedDate!, sortedWeekKeys);
    if (plan.sessionNumber !== sessionNumber || plan.week !== week) {
      updates.push(
        prisma.plan_sessions.update({
          where: { id: plan.id },
          data: { sessionNumber, week },
        }),
        prisma.planned_workouts.updateMany({ where: { id: plan.id }, data: { sessionNumber } })
      );
    }
    sessionNumber++;
  }

  for (const plan of plansWithoutDate) {
    if (plan.sessionNumber !== sessionNumber || plan.week !== null) {
      updates.push(
        prisma.plan_sessions.update({
          where: { id: plan.id },
          data: { sessionNumber, week: null },
        }),
        prisma.planned_workouts.updateMany({ where: { id: plan.id }, data: { sessionNumber } })
      );
    }
    sessionNumber++;
  }

  for (const plan of linkedPlans) {
    const linkedNumber = planToWorkoutNumber.get(plan.id);
    if (linkedNumber !== undefined && plan.sessionNumber !== linkedNumber) {
      updates.push(
        prisma.plan_sessions.update({
          where: { id: plan.id },
          data: { sessionNumber: linkedNumber },
        }),
        prisma.planned_workouts.updateMany({ where: { id: plan.id }, data: { sessionNumber: linkedNumber } })
      );
    }
  }

  if (updates.length) {
    await prisma.$transaction(updates);
  }
}

async function assertExternalActivityAvailable(
  tx: Tx,
  userId: string,
  source: string | null | undefined,
  externalId: string | null | undefined,
  currentWorkoutId?: string
) {
  if (!source || !externalId) return;

  const existing = await tx.external_activities.findFirst({
    where: { userId, source, externalId },
    select: { workoutId: true },
  });

  if (existing && existing.workoutId !== currentWorkoutId) {
    throw new DuplicateExternalActivityError(externalId);
  }
}

async function upsertWeatherObservation(tx: Tx, workoutId: string, weather: Record<string, unknown> | null, date: Date | null) {
  if (!weather) return null;

  const numericField = (key: string) =>
    typeof weather[key] === 'number' ? (weather[key] as number) : null;

  const fields = {
    observedAt: date,
    temperature: numericField('temperature'),
    apparentTemperature: numericField('apparentTemperature'),
    humidity: numericField('humidity'),
    windSpeed: numericField('windSpeed'),
    precipitation: numericField('precipitation'),
    conditionCode: numericField('conditionCode'),
    payload: weather as Prisma.InputJsonValue,
  };

  const observation = await tx.weather_observations.upsert({
    where: { workoutId },
    update: fields,
    create: { workoutId, ...fields },
  });
  await tx.external_activities.updateMany({ where: { workoutId }, data: { weatherStatus: 'done' } });
  return observation;
}

async function upsertExternalActivity(tx: Tx, workoutId: string, userId: string, source: string | null, externalId: string | null, stravaData: Prisma.JsonValue | null, date: Date | null) {
  if (!source || !externalId) return null;
  const shouldMarkNoStreams =
    source === 'strava' && isStravaActivityLikelyStreamless(stravaData);

  const existing = await tx.external_activities.findFirst({
    where: { userId, source, externalId },
  });

  if (existing && existing.workoutId !== workoutId) {
    throw new DuplicateExternalActivityError(externalId);
  }

  const activityPayload =
    stravaData && typeof stravaData === 'object' && !Array.isArray(stravaData)
      ? (stravaData as Record<string, unknown>)
      : null;
  const polyline = routePolylineFromActivity(activityPayload);
  const hasCoordinates = Boolean(polyline || activityPayload?.start_latlng);
  const v3Fields = {
    provider: toProvider(source),
    syncedAt: new Date(),
    ...(stravaData
      ? { rawPayload: stravaData as Prisma.InputJsonValue, payloadKind: payloadKindOf(activityPayload) }
      : {}),
    ...(polyline ? { hasRoute: true, routeStatus: 'done' as const } : {}),
  };

  const activity = existing
    ? await tx.external_activities.update({
        where: { id: existing.id },
        data: {
          startedAt: date,
          ...(shouldMarkNoStreams ? { sourceStatus: 'no_streams', streamsStatus: 'not_applicable' as const } : {}),
          ...v3Fields,
        },
      })
    : await tx.external_activities.create({
        data: {
          workoutId,
          userId,
          source,
          externalId,
          startedAt: date,
          sourceStatus: shouldMarkNoStreams ? 'no_streams' : 'imported',
          streamsStatus: shouldMarkNoStreams ? 'not_applicable' : 'pending',
          weatherStatus: hasCoordinates ? 'pending' : 'not_applicable',
          ...v3Fields,
        },
      });

  if (stravaData) {
    const payloadInput = stravaData as Prisma.InputJsonValue;
    const payloadType = source === 'strava' ? 'strava_activity' : `${source}_activity`;

    await tx.external_payloads.upsert({
      where: { externalActivityId: activity.id },
      update: { payload: payloadInput, payloadType },
      create: { externalActivityId: activity.id, payload: payloadInput, payloadType },
    });
  }

  return activity;
}

async function replaceStreams(tx: Tx, workoutId: string, stravaStreams: Prisma.JsonValue | null) {
  if (!stravaStreams || typeof stravaStreams !== 'object') return;

  await tx.workout_streams.deleteMany({ where: { workoutId } });

  const streams = stravaStreams as Record<string, unknown>;
  for (const [streamType, streamValue] of Object.entries(streams)) {
    if (!streamValue || typeof streamValue !== 'object') continue;
    const streamData = streamValue as Record<string, unknown>;

    const stream = await tx.workout_streams.create({
      data: {
        workoutId,
        streamType,
        resolution: typeof streamData.resolution === 'string' ? streamData.resolution : null,
        seriesType: typeof streamData.series_type === 'string' ? streamData.series_type : null,
        originalSize: typeof streamData.original_size === 'number' ? streamData.original_size : null,
      },
    });

    await tx.workout_stream_chunks.create({
      data: {
        workoutStreamId: stream.id,
        chunkIndex: 0,
        data: streamData as Prisma.InputJsonValue,
      },
    });
  }

  const streamsV3 = buildStreamsV3(streams);
  if (streamsV3) {
    await tx.workout_streams_v3.upsert({
      where: { workoutId },
      update: { ...streamsV3, capturedAt: new Date() },
      create: { workoutId, ...streamsV3 },
    });
    await tx.external_activities.updateMany({
      where: { workoutId },
      data: { hasStreams: true, streamsStatus: 'done' },
    });
  }
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
    select: { id: true, date: true },
  });

  if (!workout) return null;

  await upsertWeatherObservation(prisma, workout.id, sanitizedWeather, workout.date);
  return workout.id;
}

export async function updateSessionStreams(
  id: string,
  userId: string,
  streams: Record<string, unknown>
) {
  const sanitizedStreams = parsePayload(stravaStreamPayloadSchema, streams, 'streams');
  if (!sanitizedStreams) return null;

  const workout = await prisma.workouts.findFirst({
    where: { userId, id },
    select: { id: true },
  });

  if (!workout) return null;

  await prisma.$transaction((tx) =>
    replaceStreams(tx, workout.id, sanitizedStreams as Prisma.JsonValue)
  );
  return workout.id;
}

export async function attachRoutePolyline(
  workoutId: string,
  userId: string,
  polyline: string
) {
  const [external, workout] = await Promise.all([
    prisma.external_activities.findFirst({
      where: { workoutId, userId },
      select: { id: true, externalId: true, external_payloads: { select: { payload: true } } },
    }),
    prisma.workouts.findFirst({ where: { id: workoutId, userId }, select: { routePolyline: true } }),
  ]);

  if (!external?.external_payloads || !workout) return null;

  const payload = external.external_payloads.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const hasMap = Boolean((payload as Record<string, unknown>).map);
  if (hasMap && workout.routePolyline) return external.id;

  await prisma.$transaction([
    ...(hasMap
      ? []
      : [
          prisma.external_payloads.update({
            where: { externalActivityId: external.id },
            data: {
              payload: {
                ...(payload as Record<string, unknown>),
                map: { id: `route_${external.externalId}`, summary_polyline: polyline },
              } as Prisma.InputJsonValue,
            },
          }),
        ]),
    prisma.workouts.update({
      where: { id: workoutId },
      data: { routePolyline: workout.routePolyline ?? polyline },
    }),
    prisma.external_activities.update({
      where: { id: external.id },
      data: { hasRoute: true, routeStatus: 'done' },
    }),
  ]);

  return external.id;
}

export async function markSessionNoStreams(
  id: string,
  userId: string
) {
  const workout = await prisma.workouts.findFirst({
    where: { userId, id },
    select: { id: true },
  });

  if (!workout) return null;

  const external = await prisma.external_activities.findFirst({
    where: { workoutId: workout.id, source: 'strava' },
    select: { id: true },
  });

  if (!external) return null;

  await prisma.external_activities.update({
    where: { id: external.id },
    data: { sourceStatus: 'no_streams', hasStreams: false, streamsStatus: 'not_applicable' },
  });

  return external.id;
}

export async function createPlannedSession(
  payload: Record<string, unknown>,
  userId: string,
  options?: { skipRecalculate?: boolean }
) {
  const plannedDate = payload.plannedDate ? new Date(String(payload.plannedDate)) : null;

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.plan_sessions.create({
      data: {
        userId,
        sessionNumber: 0,
        week: null,
        plannedDate,
        sessionType: payload.sessionType ? String(payload.sessionType) : null,
        status: 'planned',
        targetDuration: (payload.targetDuration as number | null) ?? null,
        targetDistance: (payload.targetDistance as number | null) ?? null,
        targetPace: (payload.targetPace as string | null) ?? null,
        targetHeartRateBpm: payload.targetHeartRateBpm ? String(payload.targetHeartRateBpm) : null,
        targetRPE: (payload.targetRPE as number | null) ?? null,
        intervalDetails: (payload.intervalDetails as Prisma.JsonValue) ?? Prisma.JsonNull,
        recommendationId: (payload.recommendationId as string | null) ?? null,
        comments: String(payload.comments ?? ''),
      },
    });
    await upsertPlannedWorkout(tx, created.id, userId, plannedInput(payload), { status: 'planned', workoutId: null });
    return created;
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
  const date = new Date(String(payload.date));

  const sanitizedWeather = parsePayload(weatherPayloadSchema, payload.weather, 'weather');
  const sanitizedStrava = parsePayload(stravaPayloadSchema, payload.stravaData, 'strava');
  const sanitizedStreams = parsePayload(stravaStreamPayloadSchema, payload.stravaStreams, 'streams');

  const intervalDetails = payload.intervalDetails as Prisma.JsonValue | null | undefined;
  const hasPlan = intervalDetails != null;
  const source = (payload.source as string | null) ?? null;
  const externalId = (payload.externalId as string | null) ?? null;
  const workoutV3 = buildWorkoutV3(payload, sanitizedStrava, sanitizedStreams, DEFAULT_TIMEZONE);

  const workout = await prisma.$transaction(async (tx) => {
    await assertExternalActivityAvailable(tx, userId, source, externalId);

    const plan = hasPlan
      ? await tx.plan_sessions.create({
          data: {
            userId,
            sessionNumber: 0,
            week: null,
            plannedDate: null,
            sessionType: payload.sessionType ? String(payload.sessionType) : null,
            status: 'completed',
            intervalDetails: intervalDetails ?? Prisma.JsonNull,
            comments: String(payload.comments ?? ''),
          },
        })
      : null;

    const workout = await tx.workouts.create({
      data: {
        userId,
        planSessionId: plan?.id ?? null,
        date,
        status: 'completed',
        sessionNumber: 0,
        week: null,
        sessionType: payload.sessionType ? String(payload.sessionType) : null,
        comments: String(payload.comments ?? ''),
        perceivedExertion: (payload.perceivedExertion as number | null) ?? null,
        ...workoutV3,
      },
    });

    if (plan) {
      await upsertPlannedWorkout(tx, plan.id, userId, plannedInput(payload), { status: 'completed', workoutId: workout.id });
      await replaceWorkoutIntervals(tx, workout.id, (intervalDetails as IntervalDetails | null) ?? null);
    }

    await tx.workout_metrics_raw.create({
      data: {
        workoutId: workout.id,
        durationSeconds: payload.duration ? parseDuration(String(payload.duration)) : null,
        distanceMeters: payload.distance != null ? Number(payload.distance) * 1000 : null,
        avgPace: (payload.avgPace as string | null) ?? null,
        avgHeartRate: (payload.avgHeartRate as number | null) ?? null,
        averageCadence: (payload.averageCadence as number | null) ?? null,
        elevationGain: (payload.elevationGain as number | null) ?? null,
        calories: (payload.calories as number | null) ?? null,
      },
    });

    await upsertExternalActivity(
      tx,
      workout.id,
      userId,
      source,
      externalId,
      (sanitizedStrava as Prisma.JsonValue | null) ?? null,
      date
    );

    await upsertWeatherObservation(
      tx,
      workout.id,
      (sanitizedWeather as Record<string, unknown> | null) ?? null,
      date
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
  const plan = await prisma.plan_sessions.findFirst({
    where: { userId, id: planId },
  });

  if (!plan) return null;

  const date = new Date(String(payload.date));

  const sanitizedWeather = parsePayload(weatherPayloadSchema, payload.weather, 'weather');
  const sanitizedStrava = parsePayload(stravaPayloadSchema, payload.stravaData, 'strava');
  const sanitizedStreams = parsePayload(stravaStreamPayloadSchema, payload.stravaStreams, 'streams');
  const source = (payload.source as string | null) ?? null;
  const externalId = (payload.externalId as string | null) ?? null;
  const workoutV3 = buildWorkoutV3(payload, sanitizedStrava, sanitizedStreams, DEFAULT_TIMEZONE);

  const workout = await prisma.$transaction(async (tx) => {
    await assertExternalActivityAvailable(tx, userId, source, externalId);

    const workout = await tx.workouts.create({
      data: {
        id: plan.id,
        userId,
        planSessionId: plan.id,
        date,
        status: 'completed',
        sessionNumber: 0,
        week: null,
        sessionType: payload.sessionType ? String(payload.sessionType) : (plan.sessionType || null),
        comments: String(payload.comments ?? plan.comments ?? ''),
        perceivedExertion: (payload.perceivedExertion as number | null) ?? null,
        ...workoutV3,
      },
    });

    await tx.plan_sessions.update({
      where: { id: plan.id },
      data: {
        status: 'completed',
        ...(payload.intervalDetails !== undefined && {
          intervalDetails: payload.intervalDetails === null
            ? Prisma.JsonNull
            : (payload.intervalDetails as Prisma.InputJsonValue),
        }),
      },
    });

    await upsertPlannedWorkout(
      tx,
      plan.id,
      userId,
      plannedInput({ ...payload, sessionType: undefined, comments: undefined }, plannedInputFromPlan(plan)),
      { status: 'completed', workoutId: workout.id }
    );
    if (payload.intervalDetails !== undefined) {
      await replaceWorkoutIntervals(tx, workout.id, (payload.intervalDetails as IntervalDetails | null) ?? null);
    }

    await tx.workout_metrics_raw.create({
      data: {
        workoutId: workout.id,
        durationSeconds: payload.duration ? parseDuration(String(payload.duration)) : null,
        distanceMeters: payload.distance != null ? Number(payload.distance) * 1000 : null,
        avgPace: (payload.avgPace as string | null) ?? null,
        avgHeartRate: (payload.avgHeartRate as number | null) ?? null,
        averageCadence: (payload.averageCadence as number | null) ?? null,
        elevationGain: (payload.elevationGain as number | null) ?? null,
        calories: (payload.calories as number | null) ?? null,
      },
    });

    await upsertExternalActivity(
      tx,
      workout.id,
      userId,
      source,
      externalId,
      (sanitizedStrava as Prisma.JsonValue | null) ?? null,
      date
    );

    await upsertWeatherObservation(
      tx,
      workout.id,
      (sanitizedWeather as Record<string, unknown> | null) ?? null,
      date
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
  });

  if (workout) {
    const dateUpdate = updates.date ? new Date(String(updates.date)) : null;

    await prisma.$transaction(async (tx) => {
      await tx.workouts.update({
        where: { id: workout.id },
        data: {
          sessionType: updates.sessionType !== undefined ? (updates.sessionType ? String(updates.sessionType) : null) : workout.sessionType,
          comments: updates.comments !== undefined ? String(updates.comments) : workout.comments,
          perceivedExertion: updates.perceivedExertion !== undefined ? (updates.perceivedExertion == null ? null : Number(updates.perceivedExertion)) : workout.perceivedExertion,
          ...(dateUpdate ? { date: dateUpdate, ...resolveStartedAt(updates.date, null, workout.timezone) } : {}),
          ...(updates.duration !== undefined ? { durationS: updates.duration ? parseDuration(String(updates.duration)) : null } : {}),
          ...(updates.distance !== undefined ? { distanceM: updates.distance == null ? null : Math.round(Number(updates.distance) * 1000) } : {}),
          ...(updates.avgPace !== undefined ? { paceSKm: updates.avgPace ? parseDuration(String(updates.avgPace)) : null } : {}),
          ...(updates.avgHeartRate !== undefined ? { avgHr: updates.avgHeartRate == null ? null : Math.round(Number(updates.avgHeartRate)) } : {}),
        },
      });

      await tx.workout_metrics_raw.upsert({
        where: { workoutId: workout.id },
        update: {
          durationSeconds: updates.duration !== undefined ? (updates.duration ? parseDuration(String(updates.duration)) : null) : undefined,
          avgPace: updates.avgPace !== undefined ? (updates.avgPace ? String(updates.avgPace) : null) : undefined,
          avgHeartRate: updates.avgHeartRate !== undefined ? (updates.avgHeartRate == null ? null : Number(updates.avgHeartRate)) : undefined,
          distanceMeters: updates.distance !== undefined ? (updates.distance == null ? null : Number(updates.distance) * 1000) : undefined,
        },
        create: {
          workoutId: workout.id,
          durationSeconds: updates.duration ? parseDuration(String(updates.duration)) : null,
          distanceMeters: updates.distance != null ? Number(updates.distance) * 1000 : null,
          avgPace: updates.avgPace ? String(updates.avgPace) : null,
          avgHeartRate: updates.avgHeartRate != null ? Number(updates.avgHeartRate) : null,
        },
      });

      if (updates.weather) {
        const sanitizedWeather = parsePayload(weatherPayloadSchema, updates.weather, 'weather');
        if (sanitizedWeather) {
          await upsertWeatherObservation(
            tx,
            workout.id,
            sanitizedWeather as Record<string, unknown>,
            dateUpdate ?? workout.date
          );
        }
      }

      if (updates.stravaData || updates.externalId || updates.source) {
        await assertExternalActivityAvailable(
          tx,
          userId,
          (updates.source as string | null) ?? null,
          (updates.externalId as string | null) ?? null,
          workout.id
        );
        const sanitizedStrava = parsePayload(stravaPayloadSchema, updates.stravaData, 'strava');
        await upsertExternalActivity(
          tx,
          workout.id,
          userId,
          (updates.source as string | null) ?? null,
          (updates.externalId as string | null) ?? null,
          (sanitizedStrava as Prisma.JsonValue | null) ?? null,
          dateUpdate ?? workout.date
        );
      }

      if (updates.stravaStreams) {
        const sanitizedStreams = parsePayload(stravaStreamPayloadSchema, updates.stravaStreams, 'streams');
        if (sanitizedStreams) {
          await replaceStreams(tx, workout.id, sanitizedStreams as Prisma.JsonValue);
        }
      }

      if (updates.intervalDetails !== undefined && workout.planSessionId) {
        const plan = await tx.plan_sessions.update({
          where: { id: workout.planSessionId },
          data: {
            intervalDetails: updates.intervalDetails === null
              ? Prisma.JsonNull
              : (updates.intervalDetails as Prisma.InputJsonValue),
          },
        });
        await upsertPlannedWorkout(
          tx,
          plan.id,
          userId,
          plannedInput({ intervalDetails: updates.intervalDetails, sessionType: updates.sessionType }, plannedInputFromPlan(plan)),
          { status: 'completed', workoutId: workout.id }
        );
        await replaceWorkoutIntervals(tx, workout.id, (updates.intervalDetails as IntervalDetails | null) ?? null);
      }
    });

    if (updates.date) {
      await recalculateSessionNumbers(userId);
    }

    return workout;
  }

  const plan = await prisma.plan_sessions.findFirst({
    where: { userId, id },
  });

  if (!plan) return null;

  const intervalDetailsInput = updates.intervalDetails !== undefined
    ? (updates.intervalDetails === null
        ? Prisma.JsonNull
        : (updates.intervalDetails as Prisma.InputJsonValue))
    : (plan.intervalDetails === null
        ? Prisma.JsonNull
        : (plan.intervalDetails as Prisma.InputJsonValue));

  await prisma.plan_sessions.update({
    where: { id: plan.id },
    data: {
      sessionType: updates.sessionType !== undefined ? (updates.sessionType ? String(updates.sessionType) : null) : plan.sessionType,
      comments: updates.comments !== undefined ? String(updates.comments) : plan.comments,
      plannedDate: updates.plannedDate ? new Date(String(updates.plannedDate)) : plan.plannedDate,
      targetDuration: updates.targetDuration !== undefined ? (updates.targetDuration == null ? null : Number(updates.targetDuration)) : plan.targetDuration,
      targetDistance: updates.targetDistance !== undefined ? (updates.targetDistance == null ? null : Number(updates.targetDistance)) : plan.targetDistance,
      targetPace: updates.targetPace !== undefined ? (updates.targetPace ? String(updates.targetPace) : null) : plan.targetPace,
      targetHeartRateBpm: updates.targetHeartRateBpm !== undefined ? (updates.targetHeartRateBpm ? String(updates.targetHeartRateBpm) : null) : plan.targetHeartRateBpm,
      targetRPE: updates.targetRPE !== undefined ? (updates.targetRPE == null ? null : Number(updates.targetRPE)) : plan.targetRPE,
      intervalDetails: intervalDetailsInput,
      recommendationId: updates.recommendationId !== undefined ? (updates.recommendationId ? String(updates.recommendationId) : null) : plan.recommendationId,
    },
  });

  await prisma.planned_workouts.updateMany({
    where: { id: plan.id },
    data: buildPlannedWorkoutFields(plannedInput(updates, plannedInputFromPlan(plan)), DEFAULT_TIMEZONE, { completed: false }),
  });

  await recalculateSessionNumbers(userId);

  return plan;
}

export async function deleteSession(id: string, userId: string) {
  const workout = await prisma.workouts.findFirst({
    where: { userId, id },
    select: { id: true, planSessionId: true },
  });

  if (workout) {
    await prisma.$transaction(async (tx) => {
      await tx.workouts.delete({ where: { id: workout.id } });
      if (workout.planSessionId) {
        await tx.plan_sessions.deleteMany({ where: { id: workout.planSessionId } });
        await tx.planned_workouts.deleteMany({ where: { id: workout.planSessionId } });
      }
    });
  }

  const plan = await prisma.plan_sessions.findFirst({
    where: { userId, id },
    select: { id: true },
  });

  if (plan) {
    await prisma.$transaction([
      prisma.plan_sessions.delete({ where: { id: plan.id } }),
      prisma.planned_workouts.deleteMany({ where: { id: plan.id } }),
    ]);
  }

  await recalculateSessionNumbers(userId);
}

export async function deleteSessions(ids: string[], userId: string) {
  if (!ids.length) return;

  const linkedPlanIds = await prisma.workouts.findMany({
    where: { userId, id: { in: ids }, planSessionId: { not: null } },
    select: { planSessionId: true },
  }).then((rows) => rows.map((r) => r.planSessionId!));

  const allPlanIds = [...new Set([...ids, ...linkedPlanIds])];

  await prisma.$transaction([
    prisma.workouts.deleteMany({ where: { userId, id: { in: ids } } }),
    prisma.plan_sessions.deleteMany({ where: { userId, id: { in: allPlanIds } } }),
    prisma.planned_workouts.deleteMany({ where: { userId, id: { in: allPlanIds } } }),
  ]);

  await recalculateSessionNumbers(userId);
}

export async function logSessionWriteError(error: unknown, context: Record<string, unknown>) {
  logger.error({ error, ...context }, 'session-write-failed');
}
