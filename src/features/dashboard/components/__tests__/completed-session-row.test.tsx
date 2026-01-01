import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompletedSessionRow } from '@/features/dashboard/components/completed-session-row';
import { type TrainingSession } from '@/lib/types';

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
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
}));

describe('CompletedSessionRow', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnView = vi.fn();

  const mockSession: TrainingSession = {
    id: '1',
    sessionNumber: 5,
    week: 2,
    date: '2024-01-15T10:00:00.000Z',
    sessionType: 'Footing',
    duration: '1:00:00',
    distance: 10.5,
    avgPace: '5:42',
    avgHeartRate: 145,
    perceivedExertion: 6,
    intervalDetails: null,
    comments: 'Bonne séance de récupération',
    userId: 'user1',
    status: 'completed',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRow = (session: TrainingSession = mockSession) => {
    return render(
      <table>
        <tbody>
          <CompletedSessionRow 
            session={session} 
            onEdit={mockOnEdit} 
            onDelete={mockOnDelete} 
            onView={mockOnView}
          />
        </tbody>
      </table>
    );
  };

  describe('Data rendering', () => {
    it('displays basic session information', () => {
      renderRow();

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Footing')).toBeInTheDocument();
      expect(screen.getByText('1:00:00')).toBeInTheDocument();
      expect(screen.getByText('5:42')).toBeInTheDocument();
      expect(screen.getByText('6/10')).toBeInTheDocument();
    });

    it('formats large distances correctly', () => {
      renderRow();
      expect(screen.getByText('10.50')).toBeInTheDocument();
      expect(screen.getByText('km')).toBeInTheDocument();
    });

    it('displays heart rate with unit', () => {
      renderRow();

      expect(screen.getByText('145')).toBeInTheDocument();
      expect(screen.getAllByText('bpm').length).toBeGreaterThanOrEqual(1);
    });

    it('colors RPE appropriately based on value', () => {
      // Low RPE (green)
      const { unmount: unmount1 } = renderRow({ ...mockSession, perceivedExertion: 3 });
      expect(screen.getByText('3/10')).toHaveClass('text-green-500');
      unmount1();

      // Medium RPE (yellow)
      const { unmount: unmount2 } = renderRow({ ...mockSession, perceivedExertion: 5 });
      expect(screen.getByText('5/10')).toHaveClass('text-yellow-500');
      unmount2();

      // High RPE (orange)
      const { unmount: unmount3 } = renderRow({ ...mockSession, perceivedExertion: 7 });
      expect(screen.getByText('7/10')).toHaveClass('text-orange-500');
      unmount3();

      // Very high RPE (red + bold)
      renderRow({ ...mockSession, perceivedExertion: 9 });
      const rpe = screen.getByText('9/10');
      expect(rpe).toHaveClass('text-red-500');
      expect(rpe).toHaveClass('font-bold');
    });
  });

  describe('Fractionné sessions', () => {
    const fractionnéSession: TrainingSession = {
      ...mockSession,
      sessionType: 'Fractionné',
      intervalDetails: {
        workoutType: '10x400m',
        repetitionCount: 10,
        effortDuration: '1:30',
        recoveryDuration: '1:00',
        effortDistance: 400,
        recoveryDistance: null,
        targetEffortPace: '3:45',
        targetEffortHR: 170,
        targetRecoveryPace: null,
        steps: [
          { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: null, pace: null, hr: null },
          { stepNumber: 2, stepType: 'effort', duration: '1:30', distance: 400, pace: '3:45', hr: 170 },
        ],
      },
    };

    it('displays chevron indicator for fractionné sessions', () => {
      renderRow(fractionnéSession);
      expect(screen.getByText('Fractionné')).toBeInTheDocument();
      expect(screen.getByText('10x400m')).toBeInTheDocument();
    });

    it('shows non-clickable cursor for non-fractionné sessions', () => {
      renderRow();
      const sessionTypeCell = screen.getByText('Footing').closest('td');
      expect(sessionTypeCell).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Edge cases', () => {
    it('handles missing data gracefully', () => {
      // Null week
      renderRow({ ...mockSession, week: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);

      // Null date
      renderRow({ ...mockSession, date: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  describe('Actions', () => {
    it('renders dropdown menu trigger', () => {
      renderRow();
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('calls onView when view details item is clicked', () => {
      renderRow();
      
      const menuItems = screen.getAllByTestId('dropdown-item');
      const viewItem = menuItems.find(item => item.textContent?.includes('Voir détails'));
      expect(viewItem).toBeInTheDocument();
      
      if (viewItem) {
        fireEvent.click(viewItem);
        expect(mockOnView).toHaveBeenCalledWith(mockSession);
      }
    });

    it('calls onEdit when edit item is clicked', () => {
      renderRow();
      
      const menuItems = screen.getAllByTestId('dropdown-item');
      const editItem = menuItems.find(item => item.textContent?.includes('Modifier'));
      expect(editItem).toBeInTheDocument();
      
      if (editItem) {
        fireEvent.click(editItem);
        expect(mockOnEdit).toHaveBeenCalledWith(mockSession);
      }
    });

    it('calls onDelete when delete item is clicked', () => {
      renderRow();
      
      const menuItems = screen.getAllByTestId('dropdown-item');
      const deleteItem = menuItems.find(item => item.textContent?.includes('Supprimer'));
      expect(deleteItem).toBeInTheDocument();
      
      if (deleteItem) {
        fireEvent.click(deleteItem);
        expect(mockOnDelete).toHaveBeenCalledWith('1');
      }
    });
  });
});
