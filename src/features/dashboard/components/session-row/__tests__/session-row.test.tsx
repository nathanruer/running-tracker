import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionRow } from '../session-row';
import { type TrainingSession } from '@/lib/types';

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <tr className={className} onClick={onClick}>{children}</tr>
  ),
  TableCell: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td className={className} onClick={onClick}>{children}</td>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, className }: { checked?: boolean; onCheckedChange?: () => void; className?: string }) => (
    <input type="checkbox" checked={checked} onChange={onCheckedChange} className={className} data-testid="checkbox" />
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-label">{children}</div>,
}));

vi.mock('../../interval-details-view', () => ({
  IntervalDetailsView: () => <div data-testid="interval-details">Interval Details</div>,
}));

describe('SessionRow', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnView = vi.fn();
  const mockOnToggleSelect = vi.fn();

  const mockCompletedSession: TrainingSession = {
    id: '1',
    sessionNumber: 1,
    week: 2,
    date: '2024-01-15T10:00:00.000Z',
    sessionType: 'Footing',
    duration: '01:00:00',
    distance: 10.5,
    avgPace: '05:42',
    avgHeartRate: 145,
    perceivedExertion: 6,
    intervalDetails: null,
    comments: 'Bonne séance de récupération',
    userId: 'user1',
    status: 'completed',
  };

  const mockPlannedSession: TrainingSession = {
    id: '2',
    sessionNumber: 3,
    week: 2,
    date: null,
    sessionType: 'Sortie longue',
    duration: null,
    distance: null,
    avgPace: null,
    avgHeartRate: null,
    perceivedExertion: null,
    intervalDetails: null,
    comments: 'Préparation semi-marathon',
    userId: 'user1',
    status: 'planned',
    targetDuration: 90,
    targetDistance: 18,
    targetPace: '05:00',
    targetRPE: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRow = (session: TrainingSession) => {
    return render(
      <table>
        <tbody>
          <SessionRow
            session={session}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            onView={mockOnView}
            showCheckbox={true}
            isSelected={false}
            onToggleSelect={mockOnToggleSelect}
          />
        </tbody>
      </table>
    );
  };

  describe('Completed sessions', () => {
    it('displays basic session information', () => {
      renderRow(mockCompletedSession);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Footing')).toBeInTheDocument();
      expect(screen.getByText('01:00:00')).toBeInTheDocument();
      expect(screen.getByText('05:42')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('formats distance correctly', () => {
      renderRow(mockCompletedSession);
      expect(screen.getByText('10.50')).toBeInTheDocument();
      expect(screen.getByText('km')).toBeInTheDocument();
    });

    it('displays heart rate with unit when present', () => {
      renderRow(mockCompletedSession);

      expect(screen.getByText('145')).toBeInTheDocument();
      expect(screen.getAllByText('bpm').length).toBeGreaterThanOrEqual(1);
    });

    it('displays "-" when heart rate is not provided', () => {
      renderRow({ ...mockCompletedSession, avgHeartRate: null });

      const cells = screen.getAllByText('-');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('colors RPE appropriately based on value', () => {
      const { unmount: unmount1 } = renderRow({ ...mockCompletedSession, perceivedExertion: 3 });
      expect(screen.getByText('3')).toHaveClass('text-emerald-500/90');
      unmount1();

      const { unmount: unmount2 } = renderRow({ ...mockCompletedSession, perceivedExertion: 5 });
      expect(screen.getByText('5')).toHaveClass('text-amber-500/90');
      unmount2();

      const { unmount: unmount3 } = renderRow({ ...mockCompletedSession, perceivedExertion: 7 });
      expect(screen.getByText('7')).toHaveClass('text-orange-500/90');
      unmount3();

      renderRow({ ...mockCompletedSession, perceivedExertion: 9 });
      const rpe = screen.getByText('9');
      expect(rpe).toHaveClass('text-rose-500/90');
    });
  });

  describe('Planned sessions', () => {
    it('displays session type and target values', () => {
      renderRow(mockPlannedSession);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Sortie longue')).toBeInTheDocument();
    });

    it('shows "À planifier" when no date is set', () => {
      renderRow(mockPlannedSession);
      expect(screen.getByText('À planifier')).toBeInTheDocument();
    });

    it('displays target RPE', () => {
      renderRow(mockPlannedSession);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows approximation indicator (~) for planned values', () => {
      renderRow(mockPlannedSession);
      expect(screen.getAllByText('~').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Fractionné sessions', () => {
    const fractionnéSession: TrainingSession = {
      ...mockCompletedSession,
      sessionType: 'Fractionné',
      intervalDetails: {
        workoutType: '10x400m',
        repetitionCount: 10,
        effortDuration: '01:30',
        recoveryDuration: '01:00',
        effortDistance: null,
        recoveryDistance: null,
        targetEffortPace: '03:45',
        targetEffortHR: 170,
        targetRecoveryPace: null,
        steps: [
          { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: null, pace: null, hr: null },
          { stepNumber: 2, stepType: 'effort', duration: '01:30', distance: 0.4, pace: '03:45', hr: 170 },
        ],
      },
    };

    it('displays workout type for fractionné sessions', () => {
      renderRow(fractionnéSession);
      expect(screen.getByText('Fractionné')).toBeInTheDocument();
      expect(screen.getByText('10x400m')).toBeInTheDocument();
    });

    it('can expand to show interval details when clicked', () => {
      renderRow(fractionnéSession);
      
      const row = screen.getByText('Fractionné').closest('tr');
      if (row) {
        fireEvent.click(row);
        expect(screen.getByTestId('interval-details')).toBeInTheDocument();
      }
    });
  });

  describe('Edge cases', () => {
    it('handles missing week gracefully', () => {
      renderRow({ ...mockCompletedSession, week: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('handles missing date gracefully for completed session', () => {
      renderRow({ ...mockCompletedSession, date: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('handles missing target duration gracefully for planned', () => {
      renderRow({ ...mockPlannedSession, targetDuration: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  describe('Actions', () => {
    it('renders dropdown menu trigger', () => {
      renderRow(mockCompletedSession);
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('calls onView when view details item is clicked', () => {
      renderRow(mockCompletedSession);

      const menuItems = screen.getAllByTestId('dropdown-item');
      const viewItem = menuItems.find(item => item.textContent?.includes('Voir les détails'));
      expect(viewItem).toBeInTheDocument();

      if (viewItem) {
        fireEvent.click(viewItem);
        expect(mockOnView).toHaveBeenCalledWith(mockCompletedSession);
      }
    });

    it('calls onEdit when edit item is clicked for completed session', () => {
      renderRow(mockCompletedSession);

      const menuItems = screen.getAllByTestId('dropdown-item');
      const editItem = menuItems.find(item => item.textContent?.includes('Modifier la séance'));
      expect(editItem).toBeInTheDocument();

      if (editItem) {
        fireEvent.click(editItem);
        expect(mockOnEdit).toHaveBeenCalledWith(mockCompletedSession);
      }
    });

    it('shows "Compléter / Modifier" for planned session', () => {
      renderRow(mockPlannedSession);
      
      const menuItems = screen.getAllByTestId('dropdown-item');
      const completeItem = menuItems.find(item => item.textContent?.includes('Compléter'));
      expect(completeItem).toBeInTheDocument();
    });

    it('calls onDelete when delete item is clicked', () => {
      renderRow(mockCompletedSession);
      
      const menuItems = screen.getAllByTestId('dropdown-item');
      const deleteItem = menuItems.find(item => item.textContent?.includes('Supprimer'));
      expect(deleteItem).toBeInTheDocument();
      
      if (deleteItem) {
        fireEvent.click(deleteItem);
        expect(mockOnDelete).toHaveBeenCalledWith('1');
      }
    });
  });

  describe('Selection', () => {
    it('renders checkbox when showCheckbox is true', () => {
      renderRow(mockCompletedSession);
      expect(screen.getByTestId('checkbox')).toBeInTheDocument();
    });
  });
});
