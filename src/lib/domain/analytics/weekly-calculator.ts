import type { TrainingSession } from '@/lib/types';

export interface WeeklyChartDataPoint {
  semaine: string;
  week: number;
  km: number | null;
  plannedKm: number;
  totalWithPlanned: number | null;
  completedCount: number;
  plannedCount: number;
  changePercent: number | null;
  changePercentWithPlanned: number | null;
}

export interface WeeklyStats {
  totalKm: number;
  totalSessions: number;
  averageKmPerWeek: number;
  chartData: WeeklyChartDataPoint[];
}

/**
 * Calculates weekly statistics from completed and planned sessions
 *
 * @param completedSessions Array of completed training sessions
 * @param plannedSessions Array of planned training sessions
 * @returns Weekly statistics including totals, averages, and chart data
 *
 * @example
 * const stats = calculateWeeklyStats(
 *   sessions.filter(s => s.status === 'completed'),
 *   sessions.filter(s => s.status === 'planned')
 * );
 * // stats.totalKm, stats.chartData, etc.
 */
export function calculateWeeklyStats(
  completedSessions: TrainingSession[],
  plannedSessions: TrainingSession[]
): WeeklyStats {
  if (!completedSessions || completedSessions.length === 0) {
    return {
      totalKm: 0,
      totalSessions: 0,
      averageKmPerWeek: 0,
      chartData: [],
    };
  }

  const weeklyKm: Record<number, number> = {};
  const weeklyCompletedCount: Record<number, number> = {};
  let totalKm = 0;

  completedSessions.forEach((session) => {
    const week = session.week;
    if (week === null) return;

    const distance = session.distance || 0;
    if (!weeklyKm[week]) {
      weeklyKm[week] = 0;
      weeklyCompletedCount[week] = 0;
    }
    weeklyKm[week] += distance;
    weeklyCompletedCount[week]++;
    totalKm += distance;
  });

  const weeklyPlannedKm: Record<number, number> = {};
  const weeklyPlannedCount: Record<number, number> = {};

  (plannedSessions || []).forEach((session) => {
    const week = session.week;
    if (week === null) return;

    const distance = session.distance || 0;
    if (!weeklyPlannedKm[week]) {
      weeklyPlannedKm[week] = 0;
      weeklyPlannedCount[week] = 0;
    }
    weeklyPlannedKm[week] += distance;
    weeklyPlannedCount[week]++;
  });

  const weeks = Object.keys(weeklyKm).length;
  const averageKmPerWeek = weeks > 0 ? totalKm / weeks : 0;

  const allWeeks = new Set([...Object.keys(weeklyKm), ...Object.keys(weeklyPlannedKm)]);

  const chartData = Array.from(allWeeks)
    .map((week) => {
      const weekNum = Number(week);
      const completedKm = weeklyKm[weekNum] || 0;
      const plannedKm = weeklyPlannedKm[weekNum] || 0;

      return {
        semaine: `S${week}`,
        week: weekNum,
        km: completedKm > 0 ? Number(completedKm.toFixed(1)) : null,
        plannedKm: Number(plannedKm.toFixed(1)),
        totalWithPlanned: plannedKm > 0 ? Number((completedKm + plannedKm).toFixed(1)) : null,
        completedCount: weeklyCompletedCount[weekNum] || 0,
        plannedCount: weeklyPlannedCount[weekNum] || 0,
      };
    })
    .sort((a, b) => a.week - b.week)
    .map((data, index, array) => {
      if (index === 0) {
        return { ...data, changePercent: null, changePercentWithPlanned: null };
      }

      let previousKm = null;
      for (let i = index - 1; i >= 0; i--) {
        if (array[i].km !== null) {
          previousKm = array[i].km;
          break;
        }
      }

      const changePercent =
        data.km !== null && previousKm !== null && previousKm > 0
          ? ((data.km - previousKm) / previousKm) * 100
          : null;

      const changePercentWithPlanned =
        previousKm !== null && previousKm > 0 && data.totalWithPlanned !== null
          ? ((data.totalWithPlanned - previousKm) / previousKm) * 100
          : null;

      return {
        ...data,
        changePercent: changePercent !== null ? Number(changePercent.toFixed(1)) : null,
        changePercentWithPlanned:
          changePercentWithPlanned !== null ? Number(changePercentWithPlanned.toFixed(1)) : null,
      };
    });

  return {
    totalKm,
    totalSessions: completedSessions.length,
    averageKmPerWeek,
    chartData,
  };
}
