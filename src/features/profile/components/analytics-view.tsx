import { type TrainingSession } from '@/lib/types';
import { useAnalyticsData } from '../hooks/use-analytics-data';
import { StatsCards } from './stats-cards';
import { WeeklyEvolutionChart } from './weekly-evolution-chart';

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
    <div className="mb-8">
      <StatsCards
        totalKm={stats.totalKm}
        totalSessions={stats.totalSessions}
        averageKmPerWeek={stats.averageKmPerWeek}
      />

      <WeeklyEvolutionChart
        chartData={stats.chartData}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        customDateError={customDateError}
      />
    </div>
  );
}
