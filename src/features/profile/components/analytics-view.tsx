'use client';

import dynamic from 'next/dynamic';
import { type TrainingSession } from '@/lib/types';
import type { ChartGranularity, DateRangeType } from '@/lib/domain/analytics/date-range';
import { useAnalyticsData } from '../hooks/use-analytics-data';
import { StatsCards } from './analytics/stats-cards';
import { DateRangeSelector } from './analytics/date-range-selector';


const EvolutionChart = dynamic(
  () => import('./analytics/evolution-chart').then((mod) => mod.EvolutionChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] rounded-xl border border-border/50 bg-muted/10 animate-pulse" />
    ),
  }
);

export interface AnalyticsViewProps {
  sessions: TrainingSession[];
  dateRange: DateRangeType;
  onDateRangeChange: (value: DateRangeType) => void;
  granularity: ChartGranularity;
  onGranularityChange: (value: ChartGranularity) => void;
  customStartDate: string;
  onCustomStartDateChange: (value: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (value: string) => void;
}

export function AnalyticsView({
  sessions,
  dateRange,
  onDateRangeChange,
  granularity,
  onGranularityChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
}: AnalyticsViewProps) {
  const { customDateError, rangeLabel, stats } = useAnalyticsData(sessions, {
    dateRange,
    granularity,
    customStartDate,
    customEndDate,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-row items-center justify-start px-1">
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartDateChange={onCustomStartDateChange}
          onCustomEndDateChange={onCustomEndDateChange}
          customDateError={customDateError}
          rangeLabel={rangeLabel}
        />
      </div>

      <StatsCards
        totalKm={stats.totalKm}
        totalSessions={stats.totalSessions}
        totalDurationSeconds={stats.totalDurationSeconds}
        averageKm={stats.averageKmPerBucket}
        averageDurationSeconds={stats.averageDurationPerBucket}
        averageSessions={stats.averageSessionsPerBucket}
        granularity={granularity}
      />

      <EvolutionChart
        chartData={stats.chartData}
        granularity={granularity}
        onGranularityChange={onGranularityChange}
      />
    </div>
  );
}
