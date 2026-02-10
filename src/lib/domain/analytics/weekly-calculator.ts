import type { TrainingSession } from '@/lib/types';
import { getSessionDistanceKm, getSessionDurationSeconds, getSessionEffectiveDate } from '@/lib/domain/sessions/session-selectors';

export interface WeeklyChartDataPoint {
  label: string;
  weekKey: string;
  trainingWeek: number | null;
  km: number;
  plannedKm: number;
  totalWithPlanned: number;
  completedCount: number;
  plannedCount: number;
  changePercent: number | null;
  changePercentWithPlanned: number | null;
  gapWeeks: number;
  isActive: boolean;
  weekStart: Date;
  weekEnd: Date;
  durationSeconds: number;
  avgHeartRate: number | null;
  avgPaceSeconds: number | null;
}

export interface WeeklyStats {
  totalKm: number;
  totalSessions: number;
  averageKmPerWeek: number;
  averageKmPerActiveWeek: number;
  activeWeeksCount: number;
  totalWeeksSpan: number;
  chartData: WeeklyChartDataPoint[];
}

function getISOWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  const dayNum = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayNum + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

function parseWeekKey(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
  const targetMonday = new Date(mondayWeek1);
  targetMonday.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  return targetMonday;
}

function formatWeekLabel(start: Date, end: Date, includeYear: boolean): string {
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  const yearSuffix = includeYear ? ` ${end.getFullYear()}` : '';
  
  if (start.getMonth() === end.getMonth()) {
    return `${startDay}-${endDay} ${startMonth}${yearSuffix}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}${yearSuffix}`;
}

function getNextWeekKey(weekKey: string): string {
  const monday = parseWeekKey(weekKey);
  monday.setDate(monday.getDate() + 7);
  return getISOWeekKey(monday);
}

function generateWeekRange(startWeekKey: string, endWeekKey: string): string[] {
  const weeks: string[] = [];
  let current = startWeekKey;
  while (current <= endWeekKey) {
    weeks.push(current);
    current = getNextWeekKey(current);
  }
  return weeks;
}

export function calculateWeeklyStats(
  completedSessions: TrainingSession[],
  plannedSessions: TrainingSession[]
): WeeklyStats {
  const completedList = completedSessions ?? [];
  const plannedList = plannedSessions ?? [];

  if (completedList.length === 0 && plannedList.length === 0) {
    return {
      totalKm: 0,
      totalSessions: 0,
      averageKmPerWeek: 0,
      averageKmPerActiveWeek: 0,
      activeWeeksCount: 0,
      totalWeeksSpan: 0,
      chartData: [],
    };
  }

  const weeklyKm: Record<string, number> = {};
  const weeklyDuration: Record<string, number> = {};
  const weeklyHrSum: Record<string, number> = {};
  const weeklyHrCount: Record<string, number> = {};
  const weeklyCompletedCount: Record<string, number> = {};
  let totalKm = 0;

  completedList.forEach((session) => {
    const effectiveDate = getSessionEffectiveDate(session);
    if (!effectiveDate) return;
    const sessionDate = new Date(effectiveDate);
    const weekKey = getISOWeekKey(sessionDate);
    const distance = getSessionDistanceKm(session);
    
    if (!weeklyKm[weekKey]) {
      weeklyKm[weekKey] = 0;
      weeklyDuration[weekKey] = 0;
      weeklyHrSum[weekKey] = 0;
      weeklyHrCount[weekKey] = 0;
      weeklyCompletedCount[weekKey] = 0;
    }
    
    weeklyKm[weekKey] += distance;
    weeklyCompletedCount[weekKey]++;
    totalKm += distance;

    const durationSec = getSessionDurationSeconds(session);
    weeklyDuration[weekKey] += durationSec;

    if (session.avgHeartRate) {
      weeklyHrSum[weekKey] += session.avgHeartRate;
      weeklyHrCount[weekKey]++;
    }
  });

  const weeklyPlannedKm: Record<string, number> = {};
  const weeklyPlannedCount: Record<string, number> = {};

  plannedList.forEach((session) => {
    const effectiveDate = getSessionEffectiveDate(session);
    if (!effectiveDate) return;
    const sessionDate = new Date(effectiveDate);
    const weekKey = getISOWeekKey(sessionDate);
    const distance = session.distance ?? session.targetDistance ?? 0;
    if (!weeklyPlannedKm[weekKey]) {
      weeklyPlannedKm[weekKey] = 0;
      weeklyPlannedCount[weekKey] = 0;
    }
    weeklyPlannedKm[weekKey] += distance;
    weeklyPlannedCount[weekKey]++;
  });

  const allActiveWeekKeys = new Set([...Object.keys(weeklyKm), ...Object.keys(weeklyPlannedKm)]);
  if (allActiveWeekKeys.size === 0) {
    return {
      totalKm: 0,
      totalSessions: 0,
      averageKmPerWeek: 0,
      averageKmPerActiveWeek: 0,
      activeWeeksCount: 0,
      totalWeeksSpan: 0,
      chartData: [],
    };
  }

  const sortedActiveWeeks = Array.from(allActiveWeekKeys).sort();
  const firstWeekKey = sortedActiveWeeks[0];
  const lastWeekKey = sortedActiveWeeks[sortedActiveWeeks.length - 1];
  const allWeekKeys = generateWeekRange(firstWeekKey, lastWeekKey);

  const firstYear = parseWeekKey(firstWeekKey).getFullYear();
  const lastYear = parseWeekKey(lastWeekKey).getFullYear();
  const includeYear = firstYear !== lastYear;
  
  let trainingWeekCounter = 0;
  let lastActiveIndex = -1;
  const chartData: WeeklyChartDataPoint[] = allWeekKeys.map((weekKey, index) => {
    const completedKm = weeklyKm[weekKey] || 0;
    const plannedKm = weeklyPlannedKm[weekKey] || 0;
    const completedCount = weeklyCompletedCount[weekKey] || 0;
    const plannedCount = weeklyPlannedCount[weekKey] || 0;
    const durationSeconds = weeklyDuration[weekKey] || 0;
    const hrSum = weeklyHrSum[weekKey] || 0;
    const hrCount = weeklyHrCount[weekKey] || 0;
    
    const isActive = completedKm > 0 || plannedKm > 0;
    const gapWeeks = lastActiveIndex >= 0 ? index - lastActiveIndex - 1 : 0;
    if (isActive) {
      trainingWeekCounter++;
      lastActiveIndex = index;
    }
    const monday = parseWeekKey(weekKey);
    const { start, end } = getWeekBounds(monday);

    const avgHeartRate = hrCount > 0 ? Math.round(hrSum / hrCount) : null;
    const avgPaceSeconds = completedKm > 0 ? Math.round(durationSeconds / completedKm) : null;

    return {
      label: formatWeekLabel(start, end, includeYear),
      weekKey,
      trainingWeek: isActive ? trainingWeekCounter : null,
      km: Number(completedKm.toFixed(1)),
      plannedKm: Number(plannedKm.toFixed(1)),
      totalWithPlanned: Number((completedKm + plannedKm).toFixed(1)),
      completedCount,
      plannedCount,
      changePercent: null,
      changePercentWithPlanned: null,
      gapWeeks,
      isActive,
      weekStart: start,
      weekEnd: end,
      durationSeconds,
      avgHeartRate,
      avgPaceSeconds,
    };
  });

  let previousActiveKm: number | null = null;
  chartData.forEach((data) => {
    if (!data.isActive) return;
    if (previousActiveKm !== null && previousActiveKm > 0) {
      if (data.km > 0) data.changePercent = Number((((data.km - previousActiveKm) / previousActiveKm) * 100).toFixed(1));
      if (data.totalWithPlanned > 0) data.changePercentWithPlanned = Number((((data.totalWithPlanned - previousActiveKm) / previousActiveKm) * 100).toFixed(1));
    }
    if (data.km > 0) previousActiveKm = data.km;
  });

  const activeWeeksCount = sortedActiveWeeks.filter(wk => weeklyKm[wk] > 0).length;
  return {
    totalKm,
    totalSessions: completedList.length,
    averageKmPerWeek: allWeekKeys.length > 0 ? totalKm / allWeekKeys.length : 0,
    averageKmPerActiveWeek: activeWeeksCount > 0 ? totalKm / activeWeeksCount : 0,
    activeWeeksCount,
    totalWeeksSpan: allWeekKeys.length,
    chartData,
  };
}

export { getISOWeekKey, getWeekBounds, formatWeekLabel, parseWeekKey };
