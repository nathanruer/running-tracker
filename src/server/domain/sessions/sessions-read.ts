import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/database';
import type { TrainingSession } from '@/lib/types';
import { parseSortParam, type SortConfig } from '@/lib/domain/sessions/sorting';
import { mapWorkoutToSession, mapPlanToSession } from '@/server/domain/sessions/mappers';

type SessionFilters = {
  userId: string;
  limit?: number;
  offset?: number;
  status?: string | null;
  sessionType?: string | null;
  search?: string | null;
  dateFrom?: string | null;
  sort?: string | null;
  view?: 'table' | 'full' | 'export';
};

type PrismaSearchFilter = {
  OR: Prisma.workoutsWhereInput[];
};

function buildSearchFilter(search?: string | null): PrismaSearchFilter | null {
  if (!search || !search.trim()) return null;
  const searchTerm = search.trim();
  return {
    OR: [
      { comments: { contains: searchTerm, mode: 'insensitive' } },
      { sessionType: { contains: searchTerm, mode: 'insensitive' } },
    ],
  };
}

function buildPlanSearchFilter(search?: string | null): Prisma.plan_sessionsWhereInput | null {
  if (!search || !search.trim()) return null;
  const searchTerm = search.trim();
  return {
    OR: [
      { comments: { contains: searchTerm, mode: 'insensitive' } },
      { sessionType: { contains: searchTerm, mode: 'insensitive' } },
    ],
  };
}

function buildPaceSecondsSql(expression: string): string {
  return `CASE
    WHEN ${expression} IS NULL THEN NULL
    WHEN (length(${expression}) - length(replace(${expression}, ':', ''))) = 1 THEN
      split_part(${expression}, ':', 1)::int * 60 + split_part(${expression}, ':', 2)::int
    ELSE
      split_part(${expression}, ':', 1)::int * 3600 +
      split_part(${expression}, ':', 2)::int * 60 +
      split_part(${expression}, ':', 3)::int
  END`;
}

function buildOrderBySql(config: SortConfig, includePlannedDateAsDate: boolean): string {
  if (!config.length) {
    return 'status DESC NULLS LAST, session_number DESC NULLS LAST';
  }

  const dateExpr = includePlannedDateAsDate ? 'COALESCE(date, planned_date)' : 'date';
  const sortMap: Record<SortConfig[number]['column'], { expr: string; invert?: boolean }> = {
    sessionNumber: { expr: 'session_number' },
    week: { expr: 'week' },
    date: { expr: dateExpr },
    sessionType: { expr: 'LOWER(session_type)' },
    duration: {
      expr: 'CASE WHEN status = \'planned\' THEN target_duration * 60 ELSE duration_seconds END',
    },
    distance: {
      expr: 'CASE WHEN status = \'planned\' THEN target_distance ELSE distance_meters / 1000.0 END',
    },
    avgPace: {
      expr: buildPaceSecondsSql('CASE WHEN status = \'planned\' THEN target_pace ELSE avg_pace END'),
      invert: true,
    },
    avgHeartRate: {
      expr: 'CASE WHEN status = \'planned\' THEN NULLIF(target_heart_rate_bpm, \'\')::int ELSE avg_heart_rate END',
    },
    perceivedExertion: {
      expr: 'CASE WHEN status = \'planned\' THEN target_rpe ELSE perceived_exertion END',
    },
  };

  return config
    .map((item) => {
      const mapping = sortMap[item.column];
      if (!mapping) return '';
      const direction = mapping.invert
        ? item.direction === 'asc'
          ? 'DESC'
          : 'ASC'
        : item.direction.toUpperCase();
      return `${mapping.expr} ${direction} NULLS LAST`;
    })
    .filter(Boolean)
    .join(', ');
}

async function fetchSessionPageIds(filters: SessionFilters & { includePlannedDateAsDate?: boolean }) {
  const {
    userId,
    limit,
    offset,
    status,
    sessionType,
    search,
    dateFrom,
    sort,
    includePlannedDateAsDate = false,
  } = filters;

  const sortConfig = parseSortParam(sort ?? null);
  const includePlanned = !status || status === 'all' || status === 'planned';
  const includeCompleted = !status || status === 'all' || status === 'completed';

  const params: Array<string | number | Date> = [userId];
  let paramIndex = 2;

  const whereWorkout: string[] = ['w."userId" = $1'];
  const wherePlan: string[] = ['p."userId" = $1'];

  if (sessionType && sessionType !== 'all') {
    whereWorkout.push(`w."sessionType" = $${paramIndex}`);
    wherePlan.push(`p."sessionType" = $${paramIndex}`);
    params.push(sessionType);
    paramIndex += 1;
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    whereWorkout.push(`(w."comments" ILIKE $${paramIndex} OR w."sessionType" ILIKE $${paramIndex})`);
    wherePlan.push(`(p."comments" ILIKE $${paramIndex} OR p."sessionType" ILIKE $${paramIndex})`);
    params.push(searchTerm);
    paramIndex += 1;
  }

  if (dateFrom) {
    whereWorkout.push(`w."date" >= $${paramIndex}`);
    params.push(new Date(dateFrom));
    paramIndex += 1;
  }

  const workoutQuery = includeCompleted
    ? `
      SELECT
        w.id,
        'workout'::text AS kind,
        w.status,
        w."sessionNumber" AS session_number,
        w.week,
        w."date" AS date,
        w."sessionType" AS session_type,
        w.comments,
        w."perceivedExertion" AS perceived_exertion,
        m."durationSeconds" AS duration_seconds,
        m."distanceMeters" AS distance_meters,
        m."avgPace" AS avg_pace,
        m."avgHeartRate" AS avg_heart_rate,
        NULL::int AS target_duration,
        NULL::double precision AS target_distance,
        NULL::text AS target_pace,
        NULL::text AS target_heart_rate_bpm,
        NULL::int AS target_rpe,
        NULL::timestamptz AS planned_date
      FROM "workouts" w
      LEFT JOIN "workout_metrics_raw" m ON m."workoutId" = w.id
      WHERE ${whereWorkout.join(' AND ')}
    `
    : '';

  const planQuery = includePlanned
    ? `
      SELECT
        p.id,
        'plan'::text AS kind,
        p.status,
        p."sessionNumber" AS session_number,
        p.week,
        NULL::timestamptz AS date,
        p."sessionType" AS session_type,
        p.comments,
        NULL::int AS perceived_exertion,
        NULL::int AS duration_seconds,
        NULL::double precision AS distance_meters,
        NULL::text AS avg_pace,
        NULL::int AS avg_heart_rate,
        p."targetDuration" AS target_duration,
        p."targetDistance" AS target_distance,
        p."targetPace" AS target_pace,
        p."targetHeartRateBpm" AS target_heart_rate_bpm,
        p."targetRPE" AS target_rpe,
        p."plannedDate" AS planned_date
      FROM "plan_sessions" p
      WHERE ${wherePlan.join(' AND ')}
        AND NOT EXISTS (
          SELECT 1 FROM "workouts" w2 WHERE w2."planSessionId" = p.id
        )
    `
    : '';

  const unionQuery = [workoutQuery, planQuery].filter(Boolean).join(' UNION ALL ');

  if (!unionQuery) {
    return [];
  }

  const orderBy = buildOrderBySql(sortConfig, includePlannedDateAsDate);
  const limitValue = limit && limit > 0 ? limit : null;
  const offsetValue = offset && offset > 0 ? offset : 0;

  let paginationClause = '';
  if (limitValue !== null) {
    paginationClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitValue, offsetValue);
    paramIndex += 2;
  }

  const sql = `
    SELECT id, kind
    FROM (
      ${unionQuery}
    ) session_union
    ORDER BY ${orderBy}
    ${paginationClause}
  `;

  return prisma.$queryRawUnsafe<Array<{ id: string; kind: 'workout' | 'plan' }>>(
    sql,
    ...params
  );
}

export async function fetchSessions(
  filters: SessionFilters & { includePlannedDateAsDate?: boolean }
): Promise<TrainingSession[]> {
  const { userId, limit, offset, status, sessionType, search, dateFrom, sort } = filters;
  const includePlannedDateAsDate = filters.includePlannedDateAsDate ?? false;
  const view = filters.view ?? 'full';
  const isTableView = view === 'table';
  const isExportView = view === 'export';
  const pageIds = await fetchSessionPageIds({
    userId,
    limit,
    offset,
    status,
    sessionType,
    search,
    dateFrom,
    sort,
    includePlannedDateAsDate,
  });

  if (!pageIds.length) return [];

  const workoutIds = pageIds.filter((row) => row.kind === 'workout').map((row) => row.id);
  const planIds = pageIds.filter((row) => row.kind === 'plan').map((row) => row.id);

  const workoutSelect: Prisma.workoutsSelect = {
    id: true,
    userId: true,
    planSessionId: true,
    date: true,
    status: true,
    sessionNumber: true,
    week: true,
    sessionType: true,
    comments: true,
    perceivedExertion: true,
    plan_sessions: {
      select: {
        plannedDate: true,
        sessionType: true,
        targetDuration: true,
        targetDistance: true,
        targetPace: true,
        targetHeartRateBpm: true,
        targetRPE: true,
        intervalDetails: true,
        recommendationId: true,
        comments: true,
      },
    },
    workout_metrics_raw: {
      select: {
        durationSeconds: true,
        distanceMeters: true,
        avgPace: true,
        avgHeartRate: true,
        averageCadence: true,
        elevationGain: true,
        calories: true,
      },
    },
  };

  if (isExportView) {
    workoutSelect.weather_observations = {
      select: {
        observedAt: true,
        temperature: true,
        apparentTemperature: true,
        humidity: true,
        windSpeed: true,
        precipitation: true,
        conditionCode: true,
        payload: true,
      },
    };
  }

  const planSelect: Prisma.plan_sessionsSelect = {
    id: true,
    userId: true,
    sessionNumber: true,
    week: true,
    plannedDate: true,
    sessionType: true,
    status: true,
    targetDuration: true,
    targetDistance: true,
    targetPace: true,
    targetHeartRateBpm: true,
    targetRPE: true,
    intervalDetails: true,
    recommendationId: true,
    comments: true,
  };

  const [workouts, plans] = await Promise.all([
    workoutIds.length
      ? isTableView || isExportView
        ? prisma.workouts.findMany({
            where: { userId, id: { in: workoutIds } },
            select: workoutSelect,
          })
        : prisma.workouts.findMany({
            where: { userId, id: { in: workoutIds } },
            include: {
              plan_sessions: true,
              workout_metrics_raw: true,
              external_activities: { include: { external_payloads: true } },
              weather_observations: true,
              workout_streams: {
                include: {
                  workout_stream_chunks: {
                    orderBy: { chunkIndex: 'asc' },
                    take: 1,
                  },
                },
              },
            },
          })
      : Promise.resolve([]),
    planIds.length
      ? isTableView || isExportView
        ? prisma.plan_sessions.findMany({
            where: { userId, id: { in: planIds } },
            select: planSelect,
          })
        : prisma.plan_sessions.findMany({
            where: { userId, id: { in: planIds } },
          })
      : Promise.resolve([]),
  ]);

  const workoutMap = new Map(
    workouts.map((workout) => [
      workout.id,
      isTableView
        ? mapWorkoutToSession(workout, { includeFullData: false })
        : isExportView
          ? mapWorkoutToSession(workout, { includeFullData: false, includeWeather: true })
          : mapWorkoutToSession(workout),
    ])
  );
  const planMap = new Map(
    plans.map((plan) => [plan.id, mapPlanToSession(plan, { includePlannedDateAsDate })])
  );

  return pageIds
    .map((row) => (row.kind === 'workout' ? workoutMap.get(row.id) : planMap.get(row.id)))
    .filter((session): session is TrainingSession => Boolean(session));
}

export async function fetchSessionCount(filters: Omit<SessionFilters, 'limit' | 'offset' | 'sort'>): Promise<number> {
  const { userId, status, sessionType, search, dateFrom } = filters;
  const searchFilter = buildSearchFilter(search);
  const planSearchFilter = buildPlanSearchFilter(search);
  const includePlanned = !status || status === 'all' || status === 'planned';
  const includeCompleted = !status || status === 'all' || status === 'completed';

  const workoutCount = includeCompleted
    ? await prisma.workouts.count({
        where: {
          userId,
          ...(sessionType && sessionType !== 'all' ? { sessionType } : {}),
          ...(searchFilter ?? {}),
          ...(dateFrom ? { date: { gte: new Date(dateFrom) } } : {}),
        },
      })
    : 0;

  const planCount = includePlanned
    ? await prisma.plan_sessions.count({
        where: {
          userId,
          ...(sessionType && sessionType !== 'all' ? { sessionType } : {}),
          ...(planSearchFilter ?? {}),
          workouts: { none: {} },
        },
      })
    : 0;

  return workoutCount + planCount;
}

export async function fetchSessionTypes(userId: string): Promise<string[]> {
  const [planTypes, workoutTypes] = await Promise.all([
    prisma.plan_sessions.findMany({
      where: { userId },
      distinct: ['sessionType'],
      select: { sessionType: true },
      orderBy: { sessionType: 'asc' },
    }),
    prisma.workouts.findMany({
      where: { userId },
      distinct: ['sessionType'],
      select: { sessionType: true },
      orderBy: { sessionType: 'asc' },
    }),
  ]);

  const typeSet = new Set<string>();
  for (const item of [...planTypes, ...workoutTypes]) {
    if (item.sessionType) {
      typeSet.add(item.sessionType);
    }
  }

  return Array.from(typeSet).sort();
}

export async function fetchSessionById(
  userId: string,
  id: string
): Promise<TrainingSession | null> {
  const workout = await prisma.workouts.findFirst({
    where: {
      userId,
      id,
    },
    include: {
      plan_sessions: true,
      workout_metrics_raw: true,
      external_activities: { include: { external_payloads: true } },
      weather_observations: true,
      workout_streams: {
        include: {
          workout_stream_chunks: {
            orderBy: { chunkIndex: 'asc' },
            take: 1,
          },
        },
      },
    },
  });

  if (workout) {
    return mapWorkoutToSession(workout);
  }

  const plan = await prisma.plan_sessions.findFirst({
    where: {
      userId,
      id,
      workouts: { none: {} },
    },
  });

  if (!plan) return null;

  return mapPlanToSession(plan);
}
