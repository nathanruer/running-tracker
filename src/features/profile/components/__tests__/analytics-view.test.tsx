import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsView } from '../analytics-view';
import type { TrainingSession } from '@/lib/types';

const mockUseAnalyticsData = vi.fn();

vi.mock('@/features/profile/hooks/use-analytics-data', () => ({
  useAnalyticsData: () => mockUseAnalyticsData(),
}));

vi.mock('../analytics/date-range-selector', () => ({
  DateRangeSelector: () => <div data-testid="date-range" />,
}));

vi.mock('../analytics/export-weekly-analytics', () => ({
  ExportWeeklyAnalytics: () => <div data-testid="export-weekly" />,
}));

vi.mock('../analytics/stats-cards', () => ({
  StatsCards: () => <div data-testid="stats-cards" />,
}));

vi.mock('../analytics/weekly-evolution-chart', () => ({
  WeeklyEvolutionChart: () => <div data-testid="weekly-chart" />,
}));

describe('AnalyticsView', () => {
  it('renders analytics sections', () => {
    mockUseAnalyticsData.mockReturnValue({
      dateRange: 'last_4_weeks',
      setDateRange: vi.fn(),
      customStartDate: null,
      setCustomStartDate: vi.fn(),
      customEndDate: null,
      setCustomEndDate: vi.fn(),
      customDateError: null,
      stats: {
        totalKm: 40,
        totalSessions: 5,
        averageKmPerWeek: 10,
        chartData: [],
      },
    });

    render(<AnalyticsView sessions={[] as TrainingSession[]} />);

    expect(screen.getByTestId('date-range')).toBeInTheDocument();
    expect(screen.getByTestId('export-weekly')).toBeInTheDocument();
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-chart')).toBeInTheDocument();
  });
});
