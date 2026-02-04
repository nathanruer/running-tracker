'use client';

import dynamic from 'next/dynamic';
import { type TrainingSession } from '@/lib/types';
import { useAnalyticsData } from '../hooks/use-analytics-data';
import { StatsCards } from './analytics/stats-cards';
import { DateRangeSelector } from './analytics/date-range-selector';
import { ExportWeeklyAnalytics } from './analytics/export-weekly-analytics';

const WeeklyEvolutionChart = dynamic(
  () => import('./analytics/weekly-evolution-chart').then((mod) => mod.WeeklyEvolutionChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] rounded-xl border border-border/50 bg-muted/10 animate-pulse" />
    ),
  }
);

interface AnalyticsViewProps {
  sessions: TrainingSession[];
}

export function AnalyticsView({ sessions }: AnalyticsViewProps) {
  const {
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    customDateError,
    stats,
  } = useAnalyticsData(sessions);

  return (
    <div className="space-y-8">
      <div className="flex flex-row items-center justify-start px-1">
        <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-muted/10 border border-border/40 backdrop-blur-xl shadow-xl w-fit">
          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
            customDateError={customDateError}
          />
          <div className="w-px h-4 bg-border/20 mx-2" />
          <ExportWeeklyAnalytics data={stats.chartData} />
        </div>
      </div>

      <StatsCards
        totalKm={stats.totalKm}
        totalSessions={stats.totalSessions}
        averageKmPerWeek={stats.averageKmPerWeek}
      />

      <WeeklyEvolutionChart
        chartData={stats.chartData}
      />
    </div>
  );
}
