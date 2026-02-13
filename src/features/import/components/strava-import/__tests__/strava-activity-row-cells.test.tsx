import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  ActivityCheckboxCell,
  ActivityDateCell,
  ActivityNameCell,
  ActivityDurationCell,
  ActivityDistanceCell,
  ActivityPaceCell,
  ActivityHeartRateCell,
  StravaActivityRowCells,
} from '../strava-activity-row-cells';
import type { FormattedStravaActivity } from '@/lib/services/api-client';

vi.mock('@/components/ui/table', () => ({
  TableCell: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td className={className} onClick={onClick} data-testid="table-cell">{children}</td>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, className }: { checked?: boolean; onCheckedChange?: () => void; className?: string }) => (
    <input type="checkbox" checked={checked} onChange={onCheckedChange} className={className} data-testid="checkbox" />
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ActivityCheckboxCell', () => {
  it('renders checkbox with correct checked state', () => {
    render(
      <table><tbody><tr>
        <ActivityCheckboxCell selected={true} alreadyImported={false} onToggle={() => {}} />
      </tr></tbody></table>
    );

    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('renders checkbox as unchecked when not selected', () => {
    render(
      <table><tbody><tr>
        <ActivityCheckboxCell selected={false} alreadyImported={false} onToggle={() => {}} />
      </tr></tbody></table>
    );

    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('calls onToggle when checkbox is changed', () => {
    const mockToggle = vi.fn();
    render(
      <table><tbody><tr>
        <ActivityCheckboxCell selected={false} alreadyImported={false} onToggle={mockToggle} />
      </tr></tbody></table>
    );

    const checkbox = screen.getByTestId('checkbox');
    fireEvent.click(checkbox);
    expect(mockToggle).toHaveBeenCalled();
  });

  it('renders badge when alreadyImported', () => {
    render(
      <table><tbody><tr>
        <ActivityCheckboxCell selected={false} alreadyImported={true} onToggle={() => {}} />
      </tr></tbody></table>
    );

    expect(screen.getByText('Déjà importée')).toBeInTheDocument();
    expect(screen.queryByTestId('checkbox')).not.toBeInTheDocument();
  });

  it('stops propagation when table cell is clicked', () => {
    const mockToggle = vi.fn();
    const mockParentClick = vi.fn();

    render(
      <table onClick={mockParentClick}><tbody><tr>
        <ActivityCheckboxCell selected={false} alreadyImported={false} onToggle={mockToggle} />
      </tr></tbody></table>
    );

    const cell = screen.getByTestId('table-cell');
    fireEvent.click(cell);

    // Parent click should not be called due to stopPropagation
    expect(mockParentClick).not.toHaveBeenCalled();
  });
});

describe('ActivityDateCell', () => {
  it('formats date correctly', () => {
    render(
      <table><tbody><tr>
        <ActivityDateCell date="2024-01-15T10:00:00.000Z" />
      </tr></tbody></table>
    );

    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });
});

describe('ActivityNameCell', () => {
  it('displays activity name', () => {
    render(
      <table><tbody><tr>
        <ActivityNameCell name="Morning Run" />
      </tr></tbody></table>
    );

    expect(screen.getByText('Morning Run')).toBeInTheDocument();
  });
});

describe('ActivityDurationCell', () => {
  it('displays duration', () => {
    render(
      <table><tbody><tr>
        <ActivityDurationCell duration="00:45:30" />
      </tr></tbody></table>
    );

    expect(screen.getByText('00:45:30')).toBeInTheDocument();
  });
});

describe('ActivityDistanceCell', () => {
  it('displays formatted distance with unit', () => {
    render(
      <table><tbody><tr>
        <ActivityDistanceCell distance={8.5} />
      </tr></tbody></table>
    );

    expect(screen.getByText('8.50')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
  });
});

describe('ActivityPaceCell', () => {
  it('displays pace with unit', () => {
    render(
      <table><tbody><tr>
        <ActivityPaceCell pace="05:21" />
      </tr></tbody></table>
    );

    expect(screen.getByText('05:21')).toBeInTheDocument();
    expect(screen.getByText('/km')).toBeInTheDocument();
  });
});

describe('ActivityHeartRateCell', () => {
  it('displays heart rate with unit when present', () => {
    render(
      <table><tbody><tr>
        <ActivityHeartRateCell heartRate={155} />
      </tr></tbody></table>
    );

    expect(screen.getByText('155')).toBeInTheDocument();
    expect(screen.getByText('bpm')).toBeInTheDocument();
  });

  it('displays dash when heart rate is null', () => {
    render(
      <table><tbody><tr>
        <ActivityHeartRateCell heartRate={null} />
      </tr></tbody></table>
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('StravaActivityRowCells', () => {
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

  it('renders all cells with activity data', () => {
    const mockToggle = vi.fn();
    render(
      <table><tbody><tr>
        <StravaActivityRowCells
          activity={mockActivity}
          selected={false}
          alreadyImported={false}
          onToggle={mockToggle}
        />
      </tr></tbody></table>
    );

    expect(screen.getByText('Course matinale')).toBeInTheDocument();
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
    expect(screen.getByText('00:45:30')).toBeInTheDocument();
    expect(screen.getByText('8.50')).toBeInTheDocument();
    expect(screen.getByText('05:21')).toBeInTheDocument();
    expect(screen.getByText('155')).toBeInTheDocument();
  });

  it('passes selected state to checkbox', () => {
    render(
      <table><tbody><tr>
        <StravaActivityRowCells
          activity={mockActivity}
          selected={true}
          alreadyImported={false}
          onToggle={() => {}}
        />
      </tr></tbody></table>
    );

    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeChecked();
  });
});
