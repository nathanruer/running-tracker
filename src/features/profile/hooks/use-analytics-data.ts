import { useMemo } from 'react';
import { type TrainingSession } from '@/lib/types';
import { useDateRangeFilter } from '@/features/sessions/hooks/use-date-range-filter';
import { calculateWeeklyStats } from '@/lib/domain/analytics/weekly-calculator';

/**
 * Hook for managing analytics data filtering and calculations
 * Handles completed and planned sessions with date range filtering
 */
export function useAnalyticsData(sessions: TrainingSession[]) {
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === 'completed' && s.date),
    [sessions]
  );

  const {
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    filteredItems: filteredCompletedSessions,
    dateError: customDateError,
  } = useDateRangeFilter(completedSessions, 'all');

  const filteredPlannedSessions = useMemo(() => {
    const plannedSessions = sessions.filter((s) => s.status === 'planned' && s.week !== null);

    if (dateRange === 'all') return plannedSessions;

    const now = new Date();
    return plannedSessions.filter((session) => {
      const sessionDate = session.date ? new Date(session.date) : null;
      if (!sessionDate) return true;

      if (dateRange === '2weeks') {
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        return sessionDate >= twoWeeksAgo;
      } else if (dateRange === '4weeks') {
        const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        return sessionDate >= fourWeeksAgo;
      } else if (dateRange === '12weeks') {
        const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
        return sessionDate >= twelveWeeksAgo;
      } else if (dateRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;

        const startDate = customStartDate ? new Date(customStartDate + 'T00:00:00') : null;
        const endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : null;

        if (startDate && endDate) {
          return sessionDate >= startDate && sessionDate <= endDate;
        } else if (startDate) {
          return sessionDate >= startDate;
        } else if (endDate) {
          return sessionDate <= endDate;
        }
      }
      return true;
    });
  }, [sessions, dateRange, customStartDate, customEndDate]);

  const stats = useMemo(
    () => calculateWeeklyStats(filteredCompletedSessions, filteredPlannedSessions),
    [filteredCompletedSessions, filteredPlannedSessions]
  );

  return {
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    customDateError,
    stats,
  };
}
