import { Prisma } from '@prisma/client';
import type { SortConfig, SortColumn, SortDirection } from './sorting';

type PrismaOrderBy = Prisma.training_sessionsOrderByWithRelationInput;

const COLUMN_MAPPING: Record<
  SortColumn,
  {
    primaryField: keyof Prisma.training_sessionsOrderByWithRelationInput;
    coalesceField?: keyof Prisma.training_sessionsOrderByWithRelationInput;
    invertDirection?: boolean;
  }
> = {
  sessionNumber: { primaryField: 'sessionNumber' },
  week: { primaryField: 'week' },
  date: { primaryField: 'date' },
  sessionType: { primaryField: 'sessionType' },
  duration: { primaryField: 'duration', coalesceField: 'targetDuration' },
  distance: { primaryField: 'distance', coalesceField: 'targetDistance' },
  avgPace: { primaryField: 'avgPace', coalesceField: 'targetPace', invertDirection: true },
  avgHeartRate: { primaryField: 'avgHeartRate', coalesceField: 'targetHeartRateBpm' },
  perceivedExertion: { primaryField: 'perceivedExertion', coalesceField: 'targetRPE' },
};

function getEffectiveDirection(
  direction: SortDirection,
  invertDirection?: boolean
): 'asc' | 'desc' {
  if (!invertDirection) return direction;
  return direction === 'asc' ? 'desc' : 'asc';
}

function buildSimpleOrderBy(
  column: SortColumn,
  direction: SortDirection
): PrismaOrderBy {
  const mapping = COLUMN_MAPPING[column];
  const effectiveDirection = getEffectiveDirection(direction, mapping.invertDirection);

  return {
    [mapping.primaryField]: {
      sort: effectiveDirection,
      nulls: 'last',
    },
  } as PrismaOrderBy;
}

export function buildPrismaOrderBy(config: SortConfig): PrismaOrderBy[] {
  if (!config.length) {
    return [
      { status: 'desc' },
      { sessionNumber: 'desc' },
    ];
  }

  const orderBy: PrismaOrderBy[] = [];

  for (const item of config) {
    orderBy.push(buildSimpleOrderBy(item.column, item.direction));
  }

  return orderBy;
}

export function buildRawOrderByClause(config: SortConfig): string {
  if (!config.length) {
    return 'ORDER BY "status" DESC, "sessionNumber" DESC';
  }

  const clauses: string[] = [];

  for (const item of config) {
    const clause = buildRawColumnOrderBy(item.column, item.direction);
    if (clause) {
      clauses.push(clause);
    }
  }

  if (clauses.length === 0) {
    return 'ORDER BY "status" DESC, "sessionNumber" DESC';
  }

  return `ORDER BY ${clauses.join(', ')}`;
}

function buildRawColumnOrderBy(column: SortColumn, direction: SortDirection): string {
  const mapping = COLUMN_MAPPING[column];
  const effectiveDirection = getEffectiveDirection(direction, mapping.invertDirection);
  const directionSql = effectiveDirection.toUpperCase();

  if (!mapping.coalesceField) {
    return `"${mapping.primaryField}" ${directionSql} NULLS LAST`;
  }

  switch (column) {
    case 'distance':
    case 'perceivedExertion':
      return `COALESCE("${mapping.primaryField}", "${mapping.coalesceField}") ${directionSql} NULLS LAST`;

    case 'duration':
      return `COALESCE(
        EXTRACT(EPOCH FROM "${mapping.primaryField}"::interval),
        "${mapping.coalesceField}" * 60
      ) ${directionSql} NULLS LAST`;

    case 'avgPace':
      return `COALESCE(
        EXTRACT(EPOCH FROM "${mapping.primaryField}"::interval),
        EXTRACT(EPOCH FROM "${mapping.coalesceField}"::interval)
      ) ${directionSql} NULLS LAST`;

    case 'avgHeartRate':
      return `COALESCE(
        "${mapping.primaryField}",
        "${mapping.coalesceField}"::integer
      ) ${directionSql} NULLS LAST`;

    default:
      return `"${mapping.primaryField}" ${directionSql} NULLS LAST`;
  }
}

export function getSortedSessionsQuery(
  userId: string,
  config: SortConfig,
  options: {
    sessionType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Prisma.Sql {
  const conditions: string[] = [`"userId" = '${userId}'`];

  if (options.status && options.status !== 'all') {
    conditions.push(`"status" = '${options.status}'`);
  }

  if (options.sessionType && options.sessionType !== 'all') {
    conditions.push(`"sessionType" = '${options.sessionType}'`);
  }

  const whereClause = conditions.join(' AND ');
  const orderByClause = buildRawOrderByClause(config);

  let limitClause = '';
  if (options.limit && options.limit > 0) {
    limitClause = ` LIMIT ${options.limit}`;
    if (options.offset && options.offset > 0) {
      limitClause += ` OFFSET ${options.offset}`;
    }
  }

  return Prisma.sql`
    SELECT *
    FROM "training_sessions"
    WHERE ${Prisma.raw(whereClause)}
    ${Prisma.raw(orderByClause)}
    ${Prisma.raw(limitClause)}
  `;
}

export function isSimpleSortConfig(config: SortConfig): boolean {
  return config.every((item) => {
    const mapping = COLUMN_MAPPING[item.column];
    return !mapping.coalesceField;
  });
}
