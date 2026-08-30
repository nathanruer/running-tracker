import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/database';
import type { TrainingSession } from '@/lib/types';
import { parseSortParam, type SortConfig } from '@/lib/domain/sessions/sorting';
import { familyLabelSql, sessionTypeFromStructure } from '@/lib/domain/workouts/structure';
import {
  mapWorkoutToSession,
  mapPlannedWorkoutToSession,
  type ExternalFlags,
} from '@/server/domain/sessions/mappers';

const EXTERNAL_ACTIVITY_SELECT = {
  source: true,
  externalId: true,
  sourceStatus: true,
  rawPayload: true,
  hasStreams: true,
  streamsStatus: true,
} satisfies Prisma.external_activitiesSelect;

const PLANNED_WORKOUT_SELECT = {
  id: true,
  userId: true,
  sessionNumber: true,
  plannedOn: true,
  family: true,
  structure: true,
  structureLegacy: true,
  targetDurationS: true,
  targetDistanceM: true,
  targetPaceSKm: true,
  targetHrBpm: true,
  targetRpe: true,
  recommendationId: true,
  status: true,
  notes: true,
} satisfies Prisma.planned_workoutsSelect;

const WORKOUT_INTERVALS_ARGS = {
  select: { position: true, kind: true, movingS: true, distanceM: true, paceSKm: true, avgHr: true },
  orderBy: { position: 'asc' },
} satisfies Prisma.workouts$workout_intervalsArgs;

const WORKOUT_FULL_INCLUDE = {
  planned_workout: { select: PLANNED_WORKOUT_SELECT },
  workout_intervals: WORKOUT_INTERVALS_ARGS,
  external_activities: { select: EXTERNAL_ACTIVITY_SELECT },
  weather_observations: true,
  workout_streams_v3: true,
} satisfies Prisma.workoutsInclude;

/** Legacy session type label of a planned_workouts row aliased `p`. */
const PLANNED_SESSION_TYPE_SQL = familyLabelSql('p');

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
      expr: 'CASE WHEN status = \'planned\' THEN target_duration_s ELSE duration_seconds END',
    },
    distance: {
      expr: 'CASE WHEN status = \'planned\' THEN target_distance_m ELSE distance_meters END / 1000.0',
    },
    avgPace: {
      expr: 'CASE WHEN status = \'planned\' THEN target_pace_s_km ELSE pace_s_km END',
      invert: true,
    },
    avgHeartRate: {
      expr: 'CASE WHEN status = \'planned\' THEN target_hr_bpm ELSE avg_heart_rate END',
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

/** WHERE fragments shared by the union page query and the plan count (params start at $2). */
function buildWhereFragments(sessionType?: string | null, search?: string | null, dateFrom?: string | null) {
  const params: Array<string | number | Date> = [];
  const whereWorkout: string[] = ['w."userId" = $1'];
  const wherePlan: string[] = ['p.user_id = $1', 'p.workout_id IS NULL'];
  let paramIndex = 2;

  if (sessionType && sessionType !== 'all') {
    whereWorkout.push(`w."sessionType" = $${paramIndex}`);
    wherePlan.push(`${PLANNED_SESSION_TYPE_SQL} = $${paramIndex}`);
    params.push(sessionType);
    paramIndex += 1;
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    whereWorkout.push(`(w."comments" ILIKE $${paramIndex} OR w."sessionType" ILIKE $${paramIndex})`);
    wherePlan.push(`(p.notes ILIKE $${paramIndex} OR ${PLANNED_SESSION_TYPE_SQL} ILIKE $${paramIndex})`);
    params.push(searchTerm);
    paramIndex += 1;
  }

  if (dateFrom) {
    whereWorkout.push(`w.started_at >= $${paramIndex}`);
    params.push(new Date(dateFrom));
    paramIndex += 1;
  }

  return { params, whereWorkout, wherePlan, paramIndex };
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

  const fragments = buildWhereFragments(sessionType, search, dateFrom);
  const params: Array<string | number | Date> = [userId, ...fragments.params];
  let paramIndex = fragments.paramIndex;

  const workoutQuery = includeCompleted
    ? `
      SELECT
        w.id,
        'workout'::text AS kind,
        w.status,
        w."sessionNumber" AS session_number,
        w.week,
        w.started_at AS date,
        w."sessionType" AS session_type,
        w.comments,
        w."perceivedExertion" AS perceived_exertion,
        w.duration_s AS duration_seconds,
        w.distance_m AS distance_meters,
        w.pace_s_km AS pace_s_km,
        w.avg_hr AS avg_heart_rate,
        NULL::int AS target_duration_s,
        NULL::int AS target_distance_m,
        NULL::int AS target_pace_s_km,
        NULL::int AS target_hr_bpm,
        NULL::int AS target_rpe,
        NULL::timestamptz AS planned_date
      FROM "workouts" w
      WHERE ${fragments.whereWorkout.join(' AND ')}
    `
    : '';

  const planQuery = includePlanned
    ? `
      SELECT
        p.id,
        'plan'::text AS kind,
        p.status::text AS status,
        p.session_number,
        NULL::int AS week,
        NULL::timestamptz AS date,
        ${PLANNED_SESSION_TYPE_SQL} AS session_type,
        p.notes AS comments,
        NULL::int AS perceived_exertion,
        NULL::int AS duration_seconds,
        NULL::int AS distance_meters,
        NULL::int AS pace_s_km,
        NULL::int AS avg_heart_rate,
        p.target_duration_s,
        p.target_distance_m,
        p.target_pace_s_km,
        p.target_hr_bpm,
        p.target_rpe,
        p.planned_on::timestamptz AS planned_date
      FROM "planned_workouts" p
      WHERE ${fragments.wherePlan.join(' AND ')}
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

interface ExternalFlagsRow {
  workout_id: string;
  source: string;
  external_id: string;
  source_status: string | null;
  has_payload: boolean;
  has_polyline: boolean;
  manual: boolean;
  external_id_null: boolean | null;
  upload_id_null: boolean | null;
  has_streams: boolean;
  streams_status: string;
}

async function fetchExternalFlags(
  userId: string,
  workoutIds: string[]
): Promise<Map<string, ExternalFlags>> {
  if (workoutIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<ExternalFlagsRow[]>`
    SELECT
      ea."workoutId" AS workout_id,
      ea.source,
      ea."externalId" AS external_id,
      ea."sourceStatus" AS source_status,
      (ea.raw_payload IS NOT NULL) AS has_payload,
      ea.has_route AS has_polyline,
      COALESCE(ea.raw_payload->>'manual', '') = 'true' AS manual,
      CASE
        WHEN ea.raw_payload->'external_id' IS NULL THEN NULL
        WHEN jsonb_typeof(ea.raw_payload->'external_id') = 'null' THEN true
        ELSE false
      END AS external_id_null,
      CASE
        WHEN ea.raw_payload->'upload_id' IS NULL THEN NULL
        WHEN jsonb_typeof(ea.raw_payload->'upload_id') = 'null' THEN true
        ELSE false
      END AS upload_id_null,
      ea.has_streams,
      ea.streams_status::text AS streams_status
    FROM external_activities ea
    WHERE ea."userId" = ${userId}
      AND ea."workoutId" IN (${Prisma.join(workoutIds)})
    ORDER BY ea."workoutId", CASE WHEN ea.source = 'strava' THEN 0 ELSE 1 END
  `;

  const map = new Map<string, ExternalFlags>();
  for (const row of rows) {
    if (map.has(row.workout_id)) continue;
    map.set(row.workout_id, {
      source: row.source,
      externalId: row.external_id,
      sourceStatus: row.source_status,
      hasPayload: row.has_payload,
      hasPolyline: row.has_polyline,
      manual: row.manual,
      externalIdFieldNull: row.external_id_null,
      uploadIdFieldNull: row.upload_id_null,
      hasStreams: row.has_streams,
      streamsStatus: row.streams_status,
    });
  }
  return map;
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
    startedAt: true,
    timezone: true,
    datePrecision: true,
    status: true,
    sessionNumber: true,
    week: true,
    sessionType: true,
    comments: true,
    perceivedExertion: true,
    planned_workout: { select: PLANNED_WORKOUT_SELECT },
    workout_intervals: WORKOUT_INTERVALS_ARGS,
    durationS: true,
    distanceM: true,
    paceSKm: true,
    avgHr: true,
    maxHr: true,
    avgCadence: true,
    elevationGainM: true,
    calories: true,
    routePolyline: true,
  };

  if (isTableView) {
    workoutSelect.weather_observations = {
      select: {
        id: true,
      },
    };
  }

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

  const [workouts, plans] = await Promise.all([
    workoutIds.length
      ? isTableView || isExportView
        ? prisma.workouts.findMany({
            where: { userId, id: { in: workoutIds } },
            select: workoutSelect,
          })
        : prisma.workouts.findMany({
            where: { userId, id: { in: workoutIds } },
            include: WORKOUT_FULL_INCLUDE,
          })
      : Promise.resolve([]),
    planIds.length
      ? prisma.planned_workouts.findMany({
          where: { userId, id: { in: planIds } },
          select: PLANNED_WORKOUT_SELECT,
        })
      : Promise.resolve([]),
  ]);

  const externalFlagsMap = isTableView
    ? await fetchExternalFlags(userId, workouts.map((workout) => workout.id))
    : null;

  const workoutMap = new Map(
    workouts.map((workout) => [
      workout.id,
      isTableView
        ? mapWorkoutToSession(workout, {
            includeFullData: false,
            externalFlags: externalFlagsMap?.get(workout.id) ?? null,
          })
        : isExportView
          ? mapWorkoutToSession(workout, { includeFullData: false, includeWeather: true })
          : mapWorkoutToSession(workout),
    ])
  );
  const planMap = new Map(
    plans.map((plan) => [plan.id, mapPlannedWorkoutToSession(plan, { includePlannedDateAsDate })])
  );

  return pageIds
    .map((row) => (row.kind === 'workout' ? workoutMap.get(row.id) : planMap.get(row.id)))
    .filter((session): session is TrainingSession => Boolean(session));
}

export async function fetchSessionCount(filters: Omit<SessionFilters, 'limit' | 'offset' | 'sort'>): Promise<number> {
  const { userId, status, sessionType, search, dateFrom } = filters;
  const searchFilter = buildSearchFilter(search);
  const includePlanned = !status || status === 'all' || status === 'planned';
  const includeCompleted = !status || status === 'all' || status === 'completed';

  const workoutCount = includeCompleted
    ? await prisma.workouts.count({
        where: {
          userId,
          ...(sessionType && sessionType !== 'all' ? { sessionType } : {}),
          ...(searchFilter ?? {}),
          ...(dateFrom ? { startedAt: { gte: new Date(dateFrom) } } : {}),
        },
      })
    : 0;

  let planCount = 0;
  if (includePlanned) {
    const fragments = buildWhereFragments(sessionType, search, null);
    const rows = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
      `SELECT count(*)::int AS count FROM "planned_workouts" p WHERE ${fragments.wherePlan.join(' AND ')}`,
      userId,
      ...fragments.params
    );
    planCount = Number(rows[0]?.count ?? 0);
  }

  return workoutCount + planCount;
}

export async function fetchSessionTypes(userId: string): Promise<string[]> {
  const [plans, workoutTypes] = await Promise.all([
    prisma.planned_workouts.findMany({
      where: { userId },
      select: { family: true, structure: true },
    }),
    prisma.workouts.findMany({
      where: { userId },
      distinct: ['sessionType'],
      select: { sessionType: true },
      orderBy: { sessionType: 'asc' },
    }),
  ]);

  const typeSet = new Set<string>();
  for (const plan of plans) {
    const label = sessionTypeFromStructure(plan.family, plan.structure);
    if (label) typeSet.add(label);
  }
  for (const item of workoutTypes) {
    if (item.sessionType) {
      typeSet.add(item.sessionType);
    }
  }

  return Array.from(typeSet).sort();
}

export async function getImportedExternalIds(userId: string, source: string): Promise<Set<string>> {
  const rows = await prisma.external_activities.findMany({
    where: { userId, source },
    select: { externalId: true },
  });
  return new Set(rows.map(r => r.externalId));
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
    include: WORKOUT_FULL_INCLUDE,
  });

  if (workout) {
    return mapWorkoutToSession(workout);
  }

  const plan = await prisma.planned_workouts.findFirst({
    where: {
      userId,
      id,
      workoutId: null,
    },
    select: PLANNED_WORKOUT_SELECT,
  });

  if (!plan) return null;

  return mapPlannedWorkoutToSession(plan);
}
