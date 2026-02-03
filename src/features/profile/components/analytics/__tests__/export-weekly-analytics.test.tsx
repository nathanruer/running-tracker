import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportWeeklyAnalytics } from '../export-weekly-analytics';
import type { WeeklyChartDataPoint } from '@/lib/domain/analytics/weekly-calculator';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockGenerateWeeklyCSV = vi.fn(() => 'csv');
const mockGenerateWeeklyJSON = vi.fn(() => 'json');
const mockGenerateWeeklyXLSX = vi.fn(() => new Blob(['xlsx']));
const mockFormatWeeklyData = vi.fn(() => [{ semaine: 'S01' }]);
const originalCreateElement = document.createElement;

vi.mock('@/lib/utils/export/weekly-export', () => ({
  formatWeeklyData: () => mockFormatWeeklyData(),
  generateWeeklyCSV: () => mockGenerateWeeklyCSV(),
  generateWeeklyJSON: () => mockGenerateWeeklyJSON(),
  generateWeeklyXLSX: () => mockGenerateWeeklyXLSX(),
}));

const mockData: WeeklyChartDataPoint[] = [
  {
    label: 'Sem 1',
    weekKey: '2024-W01',
    trainingWeek: 1,
    km: 30,
    completedCount: 3,
    plannedKm: 0,
    plannedCount: 0,
    durationSeconds: 10800,
    avgHeartRate: 145,
    avgPaceSeconds: 360,
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
    durationSeconds: 12600,
    avgHeartRate: 150,
    avgPaceSeconds: 345,
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
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement.call(document, tagName) as HTMLAnchorElement;
        anchor.click = vi.fn();
        return anchor;
      }
      return originalCreateElement.call(document, tagName);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('exports CSV when clicking CSV item', () => {
    render(<ExportWeeklyAnalytics data={mockData} />);
    fireEvent.click(screen.getByText('Fichier CSV'));
    expect(mockFormatWeeklyData).toHaveBeenCalled();
    expect(mockGenerateWeeklyCSV).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('exports JSON when clicking JSON item', () => {
    render(<ExportWeeklyAnalytics data={mockData} />);
    fireEvent.click(screen.getByText('Fichier JSON'));
    expect(mockGenerateWeeklyJSON).toHaveBeenCalled();
  });

  it('exports XLSX when clicking XLSX item', () => {
    render(<ExportWeeklyAnalytics data={mockData} />);
    fireEvent.click(screen.getByText('Fichier Excel (XLSX)'));
    expect(mockGenerateWeeklyXLSX).toHaveBeenCalled();
  });
});
