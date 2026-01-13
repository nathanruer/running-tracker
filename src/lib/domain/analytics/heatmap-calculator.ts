import { format, eachDayOfInterval, startOfYear, endOfYear, getDay, getYear } from 'date-fns';
import { type TrainingSession } from '@/lib/types';

export interface DayData {
  date: Date;
  sessions: TrainingSession[];
  totalKm: number;
  count: number;
}

export interface HeatmapData {
  weeks: DayData[][];
  monthLabels: { month: number; weekIndex: number }[];
  maxKm: number;
  yearStats: {
    totalSessions: number;
    totalKm: number;
    activeDays: number;
  };
}

/**
 * Calculates heatmap data for a given year and sessions
 */
export function calculateHeatmapData(sessions: TrainingSession[], selectedYear: number): HeatmapData {
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
  
  const sessionsByDate = sessions.reduce((acc, session) => {
    if (session.date) {
      const sessionDate = new Date(session.date);
      if (getYear(sessionDate) === selectedYear) {
        const dateKey = format(sessionDate, 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(session);
      }
    }
    return acc;
  }, {} as Record<string, TrainingSession[]>);

  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
  
  const dayDataMap: DayData[] = allDays.map(date => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const daySessions = sessionsByDate[dateKey] || [];
    const totalKm = daySessions.reduce((sum, s) => sum + (s.distance || s.targetDistance || 0), 0);
    return { date, sessions: daySessions, totalKm, count: daySessions.length };
  });

  const totalSessions = dayDataMap.reduce((sum, d) => sum + d.count, 0);
  const totalKmYear = dayDataMap.reduce((sum, d) => sum + d.totalKm, 0);
  const activeDays = dayDataMap.filter(d => d.count > 0).length;
  const maxKm = Math.max(...dayDataMap.map(d => d.totalKm), 1);

  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];
  
  const firstDayOfWeek = getDay(yearStart);
  const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  for (let i = 0; i < mondayOffset; i++) {
    currentWeek.push({ date: new Date(0), sessions: [], totalKm: 0, count: 0 });
  }

  dayDataMap.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: new Date(0), sessions: [], totalKm: 0, count: 0 });
    }
    weeks.push(currentWeek);
  }

  const monthLabels: { month: number; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const validDay = week.find(d => d.date.getTime() > 0);
    if (validDay) {
      const month = validDay.date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ month, weekIndex });
        lastMonth = month;
      }
    }
  });

  return { 
    weeks, 
    monthLabels, 
    maxKm,
    yearStats: { totalSessions, totalKm: totalKmYear, activeDays }
  };
}
