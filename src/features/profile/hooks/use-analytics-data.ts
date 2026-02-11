'use client';

import { useMemo } from 'react';
import { type TrainingSession } from '@/lib/types';
import { calculateBucketedStats } from '@/lib/domain/analytics/weekly-calculator';
import { getSessionEffectiveDate, isCompleted, isPlanned } from '@/lib/domain/sessions/session-selectors';
import { isCustomRangeTooShort, resolveDateRange } from '@/lib/domain/analytics/date-range';
import type { ChartGranularity, DateRangeType } from '@/lib/domain/analytics/date-range';

export interface AnalyticsFilters {
  dateRange: DateRangeType;
  granularity: ChartGranularity;
  customStartDate: string;
  customEndDate: string;
}

export function useAnalyticsData(sessions: TrainingSession[], filters: AnalyticsFilters) {
  const { dateRange, granularity, customStartDate, customEndDate } = filters;

  const customDateError = useMemo(() => {
    if (dateRange === 'custom' && customStartDate && customEndDate && isCustomRangeTooShort(customStartDate, customEndDate)) {
      return 'La plage doit être d\'au moins 2 semaines (14 jours)';
    }
    return '';
  }, [dateRange, customStartDate, customEndDate]);

  const sessionDates = useMemo(
    () => sessions.map((s) => getSessionEffectiveDate(s)).filter((d): d is string => Boolean(d)),
    [sessions]
  );

  const { start: rangeStart, end: rangeEnd, label: rangeLabel } = useMemo(
    () => resolveDateRange({ dateRange, customStartDate, customEndDate, sessionDates }),
    [dateRange, customStartDate, customEndDate, sessionDates]
  );

  const completedSessions = useMemo(
    () => sessions.filter((session) => isCompleted(session)),
    [sessions]
  );

  const plannedSessions = useMemo(
    () => sessions.filter((session) => isPlanned(session)),
    [sessions]
  );

  const stats = useMemo(
    () => {
      if (customDateError) {
        return {
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
      }

      return calculateBucketedStats({
        completedSessions,
        plannedSessions,
        rangeStart,
        rangeEnd,
        granularity,
        includePlannedInOpenBucket: dateRange === 'all' || (dateRange === 'custom' && !customEndDate),
      });
    },
    [completedSessions, plannedSessions, rangeStart, rangeEnd, granularity, dateRange, customEndDate, customDateError]
  );

  return {
    customDateError,
    rangeLabel,
    stats,
  };
}
