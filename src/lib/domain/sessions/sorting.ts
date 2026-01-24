import { parseDuration } from '@/lib/utils/duration';
import { extractHeartRateValue } from '@/lib/utils/heart-rate';

export const SORTABLE_COLUMNS = {
  sessionNumber: {
    field: 'sessionNumber',
  },
  week: {
    field: 'week',
  },
  date: {
    field: 'date',
  },
  sessionType: {
    field: 'sessionType',
  },
  duration: {
    field: 'duration',
    coalesce: 'targetDuration',
    transform: (value: number) => value * 60,
  },
  distance: {
    field: 'distance',
    coalesce: 'targetDistance',
  },
  avgPace: {
    field: 'avgPace',
    coalesce: 'targetPace',
    invertDirection: true,
  },
  avgHeartRate: {
    field: 'avgHeartRate',
    coalesce: 'targetHeartRateBpm',
  },
  perceivedExertion: {
    field: 'perceivedExertion',
    coalesce: 'targetRPE',
  },
} as const;

export type SortColumn = keyof typeof SORTABLE_COLUMNS;
export type SortDirection = 'asc' | 'desc';

export interface SortItem {
  column: SortColumn;
  direction: SortDirection;
}

export type SortConfig = SortItem[];

const VALID_COLUMNS = new Set(Object.keys(SORTABLE_COLUMNS));
const VALID_DIRECTIONS = new Set(['asc', 'desc']);
const DEFAULT_DIRECTION: SortDirection = 'desc';

export function parseSortParam(param: string | null): SortConfig {
  if (!param) return [];

  const result: SortConfig = [];
  const parts = param.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const [columnPart, directionPart] = trimmed.split(':');
    const column = columnPart?.trim();
    const direction = directionPart?.trim() || DEFAULT_DIRECTION;

    if (!column || !VALID_COLUMNS.has(column)) continue;
    if (!VALID_DIRECTIONS.has(direction)) continue;

    const alreadyExists = result.some((item) => item.column === column);
    if (alreadyExists) continue;

    result.push({
      column: column as SortColumn,
      direction: direction as SortDirection,
    });
  }

  return result;
}

export function serializeSortConfig(config: SortConfig): string {
  if (!config.length) return '';

  return config
    .map((item) => `${item.column}:${item.direction}`)
    .join(',');
}

export function getColumnSortInfo(
  config: SortConfig,
  column: SortColumn
): { position: number; direction: SortDirection } | null {
  const index = config.findIndex((item) => item.column === column);
  if (index === -1) return null;
  return {
    position: index + 1,
    direction: config[index].direction,
  };
}

export function toggleColumnSort(
  config: SortConfig,
  column: SortColumn,
  isMultiSort: boolean
): SortConfig {
  const existingIndex = config.findIndex((item) => item.column === column);

  if (isMultiSort) {
    if (existingIndex === -1) {
      return [...config, { column, direction: DEFAULT_DIRECTION }];
    }

    const existing = config[existingIndex];
    if (existing.direction === 'desc') {
      return config.map((item, i) =>
        i === existingIndex ? { ...item, direction: 'asc' as const } : item
      );
    }

    return config.filter((_, i) => i !== existingIndex);
  }

  if (existingIndex === -1) {
    return [{ column, direction: DEFAULT_DIRECTION }];
  }

  const existing = config[existingIndex];
  if (existing.direction === 'desc') {
    return [{ column, direction: 'asc' }];
  }

  return [];
}

export function getClientSortValue(
  session: {
    status?: string | null;
    duration?: string | null;
    targetDuration?: number | null;
    distance?: number | null;
    targetDistance?: number | null;
    avgPace?: string | null;
    targetPace?: string | null;
    avgHeartRate?: number | null;
    targetHeartRateBpm?: string | number | null;
    perceivedExertion?: number | null;
    targetRPE?: number | null;
    sessionNumber?: number | null;
    week?: number | null;
    date?: string | null;
    sessionType?: string;
  },
  column: SortColumn
): number | string | null {
  const isPlanned = session.status === 'planned';

  switch (column) {
    case 'sessionNumber':
      return session.sessionNumber ?? null;
    case 'week':
      return session.week ?? null;
    case 'date':
      return session.date ? new Date(session.date).getTime() : null;
    case 'sessionType':
      return session.sessionType?.toLowerCase() ?? null;
    case 'duration':
      if (isPlanned) {
        return session.targetDuration ? session.targetDuration * 60 : null;
      }
      return parseDuration(session.duration);
    case 'distance':
      return isPlanned ? (session.targetDistance ?? null) : (session.distance ?? null);
    case 'avgPace':
      return isPlanned
        ? parseDuration(session.targetPace)
        : parseDuration(session.avgPace);
    case 'avgHeartRate':
      if (isPlanned) {
        return extractHeartRateValue(session.targetHeartRateBpm);
      }
      return session.avgHeartRate ?? null;
    case 'perceivedExertion':
      return isPlanned ? (session.targetRPE ?? null) : (session.perceivedExertion ?? null);
    default:
      return null;
  }
}

export function compareValues(
  a: number | string | null,
  b: number | string | null,
  direction: SortDirection,
  invertDirection: boolean = false
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const effectiveDirection = invertDirection
    ? (direction === 'asc' ? 'desc' : 'asc')
    : direction;

  if (a < b) return effectiveDirection === 'asc' ? -1 : 1;
  if (a > b) return effectiveDirection === 'asc' ? 1 : -1;
  return 0;
}
