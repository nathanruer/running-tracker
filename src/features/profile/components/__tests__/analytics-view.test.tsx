import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsView } from '../analytics-view';
import type { TrainingSession } from '@/lib/types';

vi.mock('@/features/profile/hooks/use-analytics-data', () => ({
  useAnalyticsData: () => ({
    customDateError: null,
    rangeLabel: '26 jan → 8 fév 2026',
    stats: {
      totalKm: 40,
      totalSessions: 5,
      totalDurationSeconds: 3600,
      averageKmPerBucket: 10,
      averageDurationPerBucket: 900,
      averageSessionsPerBucket: 1.25,
      averageKmPerActiveBucket: 10,
      activeBucketsCount: 2,
      totalBuckets: 4,
      chartData: [],
    },
  }),
}));

vi.mock('../analytics/date-range-selector', () => ({
  DateRangeSelector: () => <div data-testid="date-range" />,
}));

vi.mock('../analytics/stats-cards', () => ({
  StatsCards: () => <div data-testid="stats-cards" />,
}));

vi.mock('../analytics/evolution-chart', () => ({
  EvolutionChart: () => <div data-testid="weekly-chart" />,
}));

describe('AnalyticsView', () => {
  it('renders analytics sections', async () => {
    render(
      <AnalyticsView
        sessions={[] as TrainingSession[]}
        dateRange="4weeks"
        onDateRangeChange={vi.fn()}
        granularity="week"
        onGranularityChange={vi.fn()}
        customStartDate=""
        onCustomStartDateChange={vi.fn()}
        customEndDate=""
        onCustomEndDateChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('date-range')).toBeInTheDocument();
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
    expect(await screen.findByTestId('weekly-chart')).toBeInTheDocument();
  });
});
