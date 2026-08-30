import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/database';
import type { TrainingSession } from '@/lib/types';
import { parseSortParam, type SortConfig } from '@/lib/domain/sessions/sorting';
import { familyLabel, familyLabelSql, sessionTypeFromStructure } from '@/lib/domain/workouts/structure';
import {
  mapWorkoutToSession,
  mapPlannedWorkoutToSession,
  type ExternalFlags,
} from '@/server/domain/sessions/mappers';
import { toProvider } from './workout-v3';

const WORKOUT_SOURCE_SELECT = {
  provider: true,
  externalId: true,
  hasStreams: true,
  streamsStatus: true,
} satisfies Prisma.workout_sourcesSelect;

const PLANNED_WORKOUT_SELECT = {
  id: true,
  userId: true,
  sessionNumber: true,
  plannedOn: true,
  family: true,
  structure: true,
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
  // Insertion order: the main recording of a merged session comes first, like the SQL flags query.
  workout_sources: { select: WORKOUT_SOURCE_SELECT, orderBy: { createdAt: 'asc' } },
  weather_observations: true,
  workout_streams: true,
} satisfies Prisma.workoutsInclude;

/** Legacy session type labels of the rows aliased `w` (workouts) and `p` (planned_workouts). */
const WORKOUT_SESSION_TYPE_SQL = familyLabelSql('w', { label: false });
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

function buildOrderBySql(config: SortConfig, includePlannedDateAsDate: boolean): string {
  if (!config.length) {
    return 'status DESC NULLS LAST, session_number DESC NULLS LAST';
  }

  const dateExpr = includePlannedDateAsDate ? 'COALESCE(date, planned_date)' : 'date';
  const sortMap: Record<SortConfig[number]['column'], { expr: string; invert?: boolean }> = {
    sessionNumber: { expr: 'session_number' },
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

/** WHERE fragments shared by the union page query and the counts (params start at $2). */
function buildWhereFragments(sessionType?: string | null, search?: string | null, dateFrom?: string | null) {
  const params: Array<string | number | Date> = [];
  const whereWorkout: string[] = ['w.user_id = $1'];
  const wherePlan: string[] = ['p.user_id = $1', 'p.workout_id IS NULL'];
  let paramIndex = 2;

  if (sessionType && sessionType !== 'all') {
    whereWorkout.push(`${WORKOUT_SESSION_TYPE_SQL} = $${paramIndex}`);
    wherePlan.push(`${PLANNED_SESSION_TYPE_SQL} = $${paramIndex}`);
    params.push(sessionType);
    paramIndex += 1;
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    whereWorkout.push(`(w.notes ILIKE $${paramIndex} OR ${WORKOUT_SESSION_TYPE_SQL} ILIKE $${paramIndex})`);
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
        'completed'::text AS status,
        w.session_number,
        w.started_at AS date,
        ${WORKOUT_SESSION_TYPE_SQL} AS session_type,
        w.rpe AS perceived_exertion,
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
        NULL::timestamptz AS date,
        ${PLANNED_SESSION_TYPE_SQL} AS session_type,
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
      s.workout_id,
      s.provider::text AS source,
      s.external_id,
      s.has_streams,
      s.streams_status::text AS streams_status
    FROM workout_sources s
    WHERE s.user_id = ${userId}
      AND s.workout_id IN (${Prisma.join(workoutIds)})
    ORDER BY s.workout_id, s.created_at
  `;

  const map = new Map<string, ExternalFlags>();
  for (const row of rows) {
    if (map.has(row.workout_id)) continue;
    map.set(row.workout_id, {
      source: row.source,
      externalId: row.external_id,
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
    startedAt: true,
    timezone: true,
    datePrecision: true,
    sessionNumber: true,
    rpe: true,
    notes: true,
    family: true,
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
    workoutSelect.weather_observations = true;
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
  const includePlanned = !status || status === 'all' || status === 'planned';
  const includeCompleted = !status || status === 'all' || status === 'completed';
  const fragments = buildWhereFragments(sessionType, search, dateFrom);

  const count = async (sql: string) => {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql, userId, ...fragments.params);
    return Number(rows[0]?.count ?? 0);
  };

  const [workoutCount, planCount] = await Promise.all([
    includeCompleted
      ? count(`SELECT count(*)::int AS count FROM "workouts" w WHERE ${fragments.whereWorkout.join(' AND ')}`)
      : 0,
    includePlanned
      ? count(`SELECT count(*)::int AS count FROM "planned_workouts" p WHERE ${fragments.wherePlan.join(' AND ')}`)
      : 0,
  ]);

  return workoutCount + planCount;
}

export async function fetchSessionTypes(userId: string): Promise<string[]> {
  const [plans, families] = await Promise.all([
    prisma.planned_workouts.findMany({
      where: { userId },
      select: { family: true, structure: true },
    }),
    prisma.workouts.findMany({
      where: { userId },
      distinct: ['family'],
      select: { family: true },
    }),
  ]);

  const typeSet = new Set<string>();
  for (const plan of plans) {
    const label = sessionTypeFromStructure(plan.family, plan.structure);
    if (label) typeSet.add(label);
  }
  for (const item of families) {
    const label = familyLabel(item.family);
    if (label) typeSet.add(label);
  }

  return Array.from(typeSet).sort();
}

export async function getImportedExternalIds(userId: string, source: string): Promise<Set<string>> {
  const provider = toProvider(source);
  if (!provider) return new Set();

  const rows = await prisma.workout_sources.findMany({
    where: { userId, provider },
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
