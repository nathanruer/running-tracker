import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StravaActivityRow } from '../strava-activity-row';
import type { FormattedStravaActivity } from '@/lib/services/api-client';

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <tr className={className} onClick={onClick} data-testid="table-row">{children}</tr>
  ),
  TableCell: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td className={className} onClick={onClick}>{children}</td>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: () => void }) => (
    <input type="checkbox" checked={checked} onChange={onCheckedChange} data-testid="checkbox" />
  ),
}));

describe('StravaActivityRow', () => {
  const mockActivity: FormattedStravaActivity = {
    externalId: '123456',
    date: '2024-01-15T10:00:00.000Z',
    comments: 'Course matinale',
    duration: '00:45:30',
    distance: 8.5,
    avgPace: '05:21',
    avgHeartRate: 155,
    sessionType: 'Run',
    source: 'strava',
    stravaData: null,
    elevationGain: null,
    averageCadence: null,
    averageTemp: null,
    calories: null,
  };

  const mockToggleSelect = vi.fn();

  const renderRow = (props?: Partial<{ activity: FormattedStravaActivity; index: number; selected: boolean; imported: boolean }>) => {
    return render(
      <table>
        <tbody>
          <StravaActivityRow
            activity={props?.activity ?? mockActivity}
            index={props?.index ?? 0}
            selected={props?.selected ?? false}
            onToggleSelect={mockToggleSelect}
            imported={props?.imported}
          />
        </tbody>
      </table>
    );
  };

  it('displays activity name', () => {
    renderRow();
    expect(screen.getByText('Course matinale')).toBeInTheDocument();
  });

  it('displays formatted date', () => {
    renderRow();
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });

  it('displays duration', () => {
    renderRow();
    expect(screen.getByText('00:45:30')).toBeInTheDocument();
  });

  it('displays formatted distance with unit', () => {
    renderRow();
    expect(screen.getByText('8.50')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
  });

  it('displays pace with unit', () => {
    renderRow();
    expect(screen.getByText('05:21')).toBeInTheDocument();
    expect(screen.getByText('/km')).toBeInTheDocument();
  });

  it('displays heart rate with unit when present', () => {
    renderRow();
    expect(screen.getByText('155')).toBeInTheDocument();
    expect(screen.getByText('bpm')).toBeInTheDocument();
  });

  it('displays "-" when heart rate is not provided', () => {
    renderRow({ activity: { ...mockActivity, avgHeartRate: null } });
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('calls onToggleSelect when row is clicked', () => {
    renderRow({ index: 5 });
    const row = screen.getByTestId('table-row');
    fireEvent.click(row);
    expect(mockToggleSelect).toHaveBeenCalledWith(5);
  });

  it('applies selected styles when selected', () => {
    renderRow({ selected: true });
    const row = screen.getByTestId('table-row');
    expect(row).toHaveClass('bg-violet-500/5');
  });

  it('shows checkbox as checked when selected', () => {
    renderRow({ selected: true });
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('applies imported styles when imported', () => {
    renderRow({ imported: true });
    const row = screen.getByTestId('table-row');
    expect(row).toHaveClass('opacity-40');
    expect(row).toHaveClass('pointer-events-none');
  });
});
