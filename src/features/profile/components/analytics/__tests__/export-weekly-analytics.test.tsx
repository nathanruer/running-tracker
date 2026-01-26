import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExportWeeklyAnalytics } from '../export-weekly-analytics';
import type { WeeklyChartDataPoint } from '@/lib/domain/analytics/weekly-calculator';

const mockData: WeeklyChartDataPoint[] = [
  {
    label: 'Sem 1',
    weekKey: '2024-W01',
    trainingWeek: 1,
    km: 30,
    completedCount: 3,
    plannedKm: 0,
    plannedCount: 0,
    totalWithPlanned: 30,
    changePercent: null,
    changePercentWithPlanned: null,
    gapWeeks: 0,
    isActive: true,
    weekStart: new Date('2024-01-01'),
    weekEnd: new Date('2024-01-07'),
  },
  {
    label: 'Sem 2',
    weekKey: '2024-W02',
    trainingWeek: 2,
    km: 35,
    completedCount: 4,
    plannedKm: 5,
    plannedCount: 1,
    totalWithPlanned: 40,
    changePercent: 16.67,
    changePercentWithPlanned: 33.33,
    gapWeeks: 0,
    isActive: true,
    weekStart: new Date('2024-01-08'),
    weekEnd: new Date('2024-01-14'),
  },
];

describe('ExportWeeklyAnalytics', () => {
  it('should render export button', () => {
    render(<ExportWeeklyAnalytics data={mockData} />);

    expect(screen.getByTestId('btn-analytics-export')).toBeInTheDocument();
  });

  it('should render Exporter text', () => {
    render(<ExportWeeklyAnalytics data={mockData} />);

    expect(screen.getByText('Exporter')).toBeInTheDocument();
  });

  it('should disable button when data is empty', () => {
    render(<ExportWeeklyAnalytics data={[]} />);

    expect(screen.getByTestId('btn-analytics-export')).toBeDisabled();
  });

  it('should enable button when data is available', () => {
    render(<ExportWeeklyAnalytics data={mockData} />);

    expect(screen.getByTestId('btn-analytics-export')).not.toBeDisabled();
  });

  it('should render download icon', () => {
    const { container } = render(<ExportWeeklyAnalytics data={mockData} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should have correct button styling', () => {
    render(<ExportWeeklyAnalytics data={mockData} />);

    const button = screen.getByTestId('btn-analytics-export');
    expect(button).toHaveClass('rounded-xl');
  });
});
