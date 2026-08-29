import { calculateBucketedStats, type BucketedStats } from './weekly-calculator';
import {
  isCustomRangeTooShort,
  resolveDateRange,
  type ChartGranularity,
  type DateRangeType,
} from './date-range';
import {
  getSessionEffectiveDate,
  isCompleted,
  isPlanned,
} from '@/lib/domain/sessions/session-selectors';
import type { TrainingSession } from '@/lib/types';

export interface AnalyticsFilters {
  dateRange: DateRangeType;
  granularity: ChartGranularity;
  customStartDate: string;
  customEndDate: string;
}

export interface AnalyticsResult {
  customDateError: string;
  rangeLabel: string;
  stats: BucketedStats;
}

export const EMPTY_BUCKETED_STATS: BucketedStats = {
  totalKm: 0,
  totalSessions: 0,
  totalDurationSeconds: 0,
  averageKmPerBucket: 0,
  averageDurationPerBucket: 0,
  averageSessionsPerBucket: 0,
  averageKmPerActiveBucket: 0,
  activeBucketsCount: 0,
  totalBuckets: 0,
  chartData: [],
};

export function computeAnalytics(
  sessions: TrainingSession[],
  filters: AnalyticsFilters
): AnalyticsResult {
  const { dateRange, granularity, customStartDate, customEndDate } = filters;

  const customDateError =
    dateRange === 'custom' &&
    customStartDate &&
    customEndDate &&
    isCustomRangeTooShort(customStartDate, customEndDate)
      ? "La plage doit être d'au moins 2 semaines (14 jours)"
      : '';

  const sessionDates = sessions
    .map((s) => getSessionEffectiveDate(s))
    .filter((d): d is string => Boolean(d));

  const { start: rangeStart, end: rangeEnd, label: rangeLabel } = resolveDateRange({
    dateRange,
    customStartDate,
    customEndDate,
    sessionDates,
  });

  if (customDateError) {
    return { customDateError, rangeLabel, stats: EMPTY_BUCKETED_STATS };
  }

  const stats = calculateBucketedStats({
    completedSessions: sessions.filter((session) => isCompleted(session)),
    plannedSessions: sessions.filter((session) => isPlanned(session)),
    rangeStart,
    rangeEnd,
    granularity,
    includePlannedInOpenBucket:
      dateRange === 'all' || (dateRange === 'custom' && !customEndDate),
  });

  return { customDateError, rangeLabel, stats };
}
