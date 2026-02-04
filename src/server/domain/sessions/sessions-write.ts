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

const logger = createLogger({ context: 'session-write' });

function parsePayload<T>(schema: z.ZodType<T>, value: unknown, label: string): T | null {
  if (value == null) return null;
  const result = schema.safeParse(value);
  if (!result.success) {
    logger.warn({ label, issues: result.error.issues }, 'session-payload-invalid');
    return null;
  }
  return result.data;
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

async function getEarliestWorkoutDate(userId: string): Promise<Date | null> {
  const first = await prisma.workouts.findFirst({
    where: { userId },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  return first?.date ?? null;
}

async function getNextSessionNumber(userId: string): Promise<number> {
  const workoutStats = await prisma.workouts.aggregate({
    where: { userId },
    _max: { sessionNumber: true },
  });

  return (workoutStats._max.sessionNumber ?? 0) + 1;
}

async function calculateSessionPosition(userId: string, date: Date) {
  const workouts = await prisma.workouts.findMany({
    where: { userId },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, date: true },
  });

  const newSessionWeekKey = getWeekKey(date);
  const weekMap = new Map<string, typeof workouts>();
  for (const workout of workouts) {
    const weekKey = getWeekKey(workout.date);
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(workout);
  }

  const sortedWeeks = Array.from(weekMap.keys()).sort();
  let weekIndex = sortedWeeks.indexOf(newSessionWeekKey);
  if (weekIndex === -1) {
    sortedWeeks.push(newSessionWeekKey);
    sortedWeeks.sort();
    weekIndex = sortedWeeks.indexOf(newSessionWeekKey);
  }

  const week = weekIndex + 1;

  let sessionNumber = 1;
  for (const workout of workouts) {
    if (workout.date < date) {
      sessionNumber++;
    }
  }

  const sameDateSessions = workouts.filter((w) => w.date.getTime() === date.getTime());
  sessionNumber += sameDateSessions.length;

  return { sessionNumber, week };
}

export async function recalculateSessionNumbers(userId: string) {
  const workouts = await prisma.workouts.findMany({
    where: { userId },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, date: true, planSessionId: true },
  });

  const planSessions = await prisma.plan_sessions.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, status: true },
  });

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  let sessionNumber = 1;

  // Build a map of planSessionId -> workoutSessionNumber for syncing
  const planToWorkoutNumber = new Map<string, number>();

  const weekMap = new Map<string, typeof workouts>();
  for (const workout of workouts) {
    const weekKey = getWeekKey(workout.date);
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(workout);
  }

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (let weekIndex = 0; weekIndex < sortedWeeks.length; weekIndex++) {
    const [, weekWorkouts] = sortedWeeks[weekIndex];
    const trainingWeek = weekIndex + 1;

    weekWorkouts.sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const workout of weekWorkouts) {
      updates.push(
        prisma.workouts.update({
          where: { id: workout.id },
          data: { sessionNumber, week: trainingWeek },
        })
      );
      if (workout.planSessionId) {
        planToWorkoutNumber.set(workout.planSessionId, sessionNumber);
      }
      sessionNumber++;
    }
  }

  let plannedSessionNumber = sessionNumber;

  for (const plan of planSessions) {
    if (plan.status === 'completed') {
      const linkedNumber = planToWorkoutNumber.get(plan.id);
      if (linkedNumber !== undefined) {
        updates.push(
          prisma.plan_sessions.update({
            where: { id: plan.id },
            data: { sessionNumber: linkedNumber },
          })
        );
      }
    } else {
      updates.push(
        prisma.plan_sessions.update({
          where: { id: plan.id },
          data: { sessionNumber: plannedSessionNumber, week: null },
        })
      );
      plannedSessionNumber++;
    }
  }

  if (updates.length) {
    await prisma.$transaction(updates);
  }
}

/**
 * Deferred version of recalculateSessionNumbers that runs in the background.
 * Use this for operations where immediate recalculation is not critical
 * (e.g., after deletions where the UI optimistically removes the item).
 * 
 * This significantly improves API response times as the caller doesn't wait
 * for the potentially expensive recalculation.
 * 
 * @param userId - The user ID to recalculate session numbers for
 * @returns void - The function returns immediately, recalculation happens in background
 */
export function recalculateSessionNumbersDeferred(userId: string): void {
  // Use setImmediate-like pattern to defer execution to next event loop tick
  // This allows the current request to complete before recalculation starts
  Promise.resolve().then(async () => {
    try {
      await recalculateSessionNumbers(userId);
    } catch (error) {
      // Log error but don't throw - this is a background operation
      logger.error({ error, userId }, 'deferred-recalculation-failed');
    }
  });
}

async function upsertWeatherObservation(workoutId: string, weather: Record<string, unknown> | null, date: Date | null) {
  if (!weather) return null;

  const temperature = typeof weather.temperature === 'number' ? weather.temperature : null;

  return prisma.weather_observations.upsert({
    where: { workoutId },
    update: {
      observedAt: date,
      temperature,
      apparentTemperature: typeof weather.apparentTemperature === 'number' ? weather.apparentTemperature : null,
      humidity: typeof weather.humidity === 'number' ? weather.humidity : null,
      windSpeed: typeof weather.windSpeed === 'number' ? weather.windSpeed : null,
      precipitation: typeof weather.precipitation === 'number' ? weather.precipitation : null,
      conditionCode: typeof weather.conditionCode === 'number' ? weather.conditionCode : null,
      payload: weather as Prisma.InputJsonValue,
    },
    create: {
      workoutId,
      observedAt: date,
      temperature,
      apparentTemperature: typeof weather.apparentTemperature === 'number' ? weather.apparentTemperature : null,
      humidity: typeof weather.humidity === 'number' ? weather.humidity : null,
      windSpeed: typeof weather.windSpeed === 'number' ? weather.windSpeed : null,
      precipitation: typeof weather.precipitation === 'number' ? weather.precipitation : null,
      conditionCode: typeof weather.conditionCode === 'number' ? weather.conditionCode : null,
      payload: weather as Prisma.InputJsonValue,
    },
  });
}

async function upsertExternalActivity(workoutId: string, source: string | null, externalId: string | null, stravaData: Prisma.JsonValue | null, date: Date | null) {
  if (!source || !externalId) return null;

  const existing = await prisma.external_activities.findFirst({
    where: { workoutId, source, externalId },
  });

  const activity = existing
    ? await prisma.external_activities.update({
        where: { id: existing.id },
        data: { startedAt: date },
      })
    : await prisma.external_activities.create({
        data: { workoutId, source, externalId, startedAt: date },
      });

  if (stravaData) {
    const payloadInput = stravaData === null
      ? Prisma.JsonNull
      : (stravaData as Prisma.InputJsonValue);

    await prisma.external_payloads.upsert({
      where: { externalActivityId: activity.id },
      update: { payload: payloadInput, payloadType: 'strava_activity' },
      create: { externalActivityId: activity.id, payload: payloadInput, payloadType: 'strava_activity' },
    });
  }

  return activity;
}

async function replaceStreams(workoutId: string, stravaStreams: Prisma.JsonValue | null) {
  if (!stravaStreams || typeof stravaStreams !== 'object') return;

  await prisma.workout_streams.deleteMany({ where: { workoutId } });

  const streams = stravaStreams as Record<string, unknown>;
  for (const [streamType, streamValue] of Object.entries(streams)) {
    if (!streamValue || typeof streamValue !== 'object') continue;
    const streamData = streamValue as Record<string, unknown>;

    const stream = await prisma.workout_streams.create({
      data: {
        workoutId,
        streamType,
        resolution: typeof streamData.resolution === 'string' ? streamData.resolution : null,
        seriesType: typeof streamData.series_type === 'string' ? streamData.series_type : null,
        originalSize: typeof streamData.original_size === 'number' ? streamData.original_size : null,
      },
    });

    await prisma.workout_stream_chunks.create({
      data: {
        workoutStreamId: stream.id,
        chunkIndex: 0,
        data: streamData as Prisma.InputJsonValue,
      },
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

  await upsertWeatherObservation(workout.id, sanitizedWeather, workout.date);
  return workout.id;
}

export async function createPlannedSession(payload: Record<string, unknown>, userId: string) {
  const plannedDate = payload.plannedDate ? new Date(String(payload.plannedDate)) : null;
  const sessionType = String(payload.sessionType ?? '');
  const comments = String(payload.comments ?? '');

  const sessionNumber = await getNextSessionNumber(userId);
  let week: number | null = null;
  if (plannedDate) {
    const firstWorkoutDate = await getEarliestWorkoutDate(userId);
    if (firstWorkoutDate) {
      const diffTime = Math.abs(plannedDate.getTime() - firstWorkoutDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      week = Math.floor(diffDays / 7) + 1;
    } else {
      week = 1;
    }
  }

  const plan = await prisma.plan_sessions.create({
    data: {
      userId,
      sessionNumber,
      week,
      plannedDate,
      sessionType,
      status: 'planned',
      targetDuration: (payload.targetDuration as number | null) ?? null,
      targetDistance: (payload.targetDistance as number | null) ?? null,
      targetPace: (payload.targetPace as string | null) ?? null,
      targetHeartRateBpm: payload.targetHeartRateBpm ? String(payload.targetHeartRateBpm) : null,
      targetRPE: (payload.targetRPE as number | null) ?? null,
      intervalDetails: (payload.intervalDetails as Prisma.JsonValue) ?? Prisma.JsonNull,
      recommendationId: (payload.recommendationId as string | null) ?? null,
      comments,
    },
  });

  return plan;
}

export async function createCompletedSession(payload: Record<string, unknown>, userId: string) {
  const date = new Date(String(payload.date));
  const { sessionNumber, week } = await calculateSessionPosition(userId, date);

  const sanitizedWeather = parsePayload(weatherPayloadSchema, payload.weather, 'weather');
  const sanitizedStrava = parsePayload(stravaPayloadSchema, payload.stravaData, 'strava');
  const sanitizedStreams = parsePayload(stravaStreamPayloadSchema, payload.stravaStreams, 'streams');

  const intervalDetails = payload.intervalDetails as Prisma.JsonValue | null | undefined;
  const hasPlan = intervalDetails != null;

  const plan = hasPlan
    ? await prisma.plan_sessions.create({
        data: {
          userId,
          sessionNumber,
          week,
          plannedDate: null,
          sessionType: String(payload.sessionType ?? ''),
          status: 'completed',
          intervalDetails: intervalDetails ?? Prisma.JsonNull,
          comments: String(payload.comments ?? ''),
        },
      })
    : null;

  const workout = await prisma.workouts.create({
    data: {
      userId,
      planSessionId: plan?.id ?? null,
      date,
      status: 'completed',
      sessionNumber,
      week,
      sessionType: String(payload.sessionType ?? ''),
      comments: String(payload.comments ?? ''),
      perceivedExertion: (payload.perceivedExertion as number | null) ?? null,
    },
  });

  await prisma.workout_metrics_raw.create({
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
    workout.id,
    (payload.source as string | null) ?? null,
    (payload.externalId as string | null) ?? null,
    (sanitizedStrava as Prisma.JsonValue | null) ?? null,
    date
  );

  await upsertWeatherObservation(
    workout.id,
    (sanitizedWeather as Record<string, unknown> | null) ?? null,
    date
  );

  await replaceStreams(workout.id, (sanitizedStreams as Prisma.JsonValue | null) ?? null);

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
  const { sessionNumber, week } = await calculateSessionPosition(userId, date);

  const sanitizedWeather = parsePayload(weatherPayloadSchema, payload.weather, 'weather');
  const sanitizedStrava = parsePayload(stravaPayloadSchema, payload.stravaData, 'strava');
  const sanitizedStreams = parsePayload(stravaStreamPayloadSchema, payload.stravaStreams, 'streams');

  const workout = await prisma.workouts.create({
    data: {
      id: plan.id,
      userId,
      planSessionId: plan.id,
      date,
      status: 'completed',
      sessionNumber,
      week,
      sessionType: String(payload.sessionType ?? plan.sessionType ?? ''),
      comments: String(payload.comments ?? plan.comments ?? ''),
      perceivedExertion: (payload.perceivedExertion as number | null) ?? null,
    },
  });

  await prisma.plan_sessions.update({
    where: { id: plan.id },
    data: { 
      status: 'completed',
      sessionNumber, // Sync with workout's sessionNumber
    },
  });

  await prisma.workout_metrics_raw.create({
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
    workout.id,
    (payload.source as string | null) ?? null,
    (payload.externalId as string | null) ?? null,
    (sanitizedStrava as Prisma.JsonValue | null) ?? null,
    date
  );

  await upsertWeatherObservation(
    workout.id,
    (sanitizedWeather as Record<string, unknown> | null) ?? null,
    date
  );

  await replaceStreams(workout.id, (sanitizedStreams as Prisma.JsonValue | null) ?? null);

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

    await prisma.workouts.update({
      where: { id: workout.id },
      data: {
        sessionType: updates.sessionType ? String(updates.sessionType) : workout.sessionType,
        comments: updates.comments ? String(updates.comments) : workout.comments,
        perceivedExertion: updates.perceivedExertion != null ? Number(updates.perceivedExertion) : workout.perceivedExertion,
        ...(dateUpdate ? { date: dateUpdate } : {}),
      },
    });

    await prisma.workout_metrics_raw.upsert({
      where: { workoutId: workout.id },
      update: {
        durationSeconds: updates.duration ? parseDuration(String(updates.duration)) : undefined,
        avgPace: updates.avgPace ? String(updates.avgPace) : undefined,
        avgHeartRate: updates.avgHeartRate != null ? Number(updates.avgHeartRate) : undefined,
        distanceMeters: updates.distance != null ? Number(updates.distance) * 1000 : undefined,
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
      if (!sanitizedWeather) {
        return workout;
      }
      await upsertWeatherObservation(
        workout.id,
        sanitizedWeather as Record<string, unknown>,
        dateUpdate ?? workout.date
      );
    }

    if (updates.stravaData || updates.externalId || updates.source) {
      const sanitizedStrava = parsePayload(stravaPayloadSchema, updates.stravaData, 'strava');
      await upsertExternalActivity(
        workout.id,
        (updates.source as string | null) ?? null,
        (updates.externalId as string | null) ?? null,
        (sanitizedStrava as Prisma.JsonValue | null) ?? null,
        dateUpdate ?? workout.date
      );
    }

    if (updates.stravaStreams) {
      const sanitizedStreams = parsePayload(stravaStreamPayloadSchema, updates.stravaStreams, 'streams');
      if (sanitizedStreams) {
        await replaceStreams(workout.id, sanitizedStreams as Prisma.JsonValue);
      }
    }

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
      sessionType: updates.sessionType ? String(updates.sessionType) : plan.sessionType,
      comments: updates.comments ? String(updates.comments) : plan.comments,
      plannedDate: updates.plannedDate ? new Date(String(updates.plannedDate)) : plan.plannedDate,
      targetDuration: updates.targetDuration != null ? Number(updates.targetDuration) : plan.targetDuration,
      targetDistance: updates.targetDistance != null ? Number(updates.targetDistance) : plan.targetDistance,
      targetPace: updates.targetPace ? String(updates.targetPace) : plan.targetPace,
      targetHeartRateBpm: updates.targetHeartRateBpm ? String(updates.targetHeartRateBpm) : plan.targetHeartRateBpm,
      targetRPE: updates.targetRPE != null ? Number(updates.targetRPE) : plan.targetRPE,
      intervalDetails: intervalDetailsInput,
      recommendationId: updates.recommendationId ? String(updates.recommendationId) : plan.recommendationId,
    },
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
    await prisma.workouts.delete({ where: { id: workout.id } });
  }

  const plan = await prisma.plan_sessions.findFirst({
    where: { userId, id },
    select: { id: true },
  });

  if (plan) {
    await prisma.plan_sessions.delete({ where: { id: plan.id } });
  }

  recalculateSessionNumbersDeferred(userId);
}

export async function deleteSessions(ids: string[], userId: string) {
  if (!ids.length) return;

  await prisma.workouts.deleteMany({
    where: { userId, id: { in: ids } },
  });

  await prisma.plan_sessions.deleteMany({
    where: { userId, id: { in: ids } },
  });

  recalculateSessionNumbersDeferred(userId);
}

export async function logSessionWriteError(error: unknown, context: Record<string, unknown>) {
  logger.error({ error, ...context }, 'session-write-failed');
}
