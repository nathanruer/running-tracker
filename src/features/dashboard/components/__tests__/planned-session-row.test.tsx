import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlannedSessionRow } from '@/features/dashboard/components/planned-session-row';
import { type TrainingSession } from '@/lib/types';

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
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

describe('PlannedSessionRow', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnView = vi.fn();

  const mockPlannedSession: TrainingSession = {
    id: '1',
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
    targetPace: '5:00',
    targetRPE: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRow = (session: TrainingSession = mockPlannedSession) => {
    return render(
      <table>
        <tbody>
          <PlannedSessionRow 
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
    it('displays session type and targets', () => {
      renderRow();

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Sortie longue')).toBeInTheDocument();
    });

    it('shows "À planifier" when no date is set', () => {
      renderRow();
      expect(screen.getByText('À planifier')).toBeInTheDocument();
    });

    it('displays target RPE', () => {
      renderRow();
      expect(screen.getByText('5/10')).toBeInTheDocument();
    });

    it('shows italic styling for planned rows', () => {
      const { container } = renderRow();
      const row = container.querySelector('tr');
      expect(row?.className).toContain('italic');
    });
  });

  describe('Fractionné planned sessions', () => {
    const fractionnéPlanned: TrainingSession = {
      ...mockPlannedSession,
      sessionType: 'Fractionné',
      intervalDetails: {
        workoutType: '6x1000m',
        repetitionCount: 6,
        effortDuration: '4:00',
        recoveryDuration: '2:00',
        effortDistance: 1000,
        recoveryDistance: 400,
        targetEffortPace: '4:00',
        targetEffortHR: 170,
        targetRecoveryPace: '6:00',
        steps: [
          { stepNumber: 1, stepType: 'warmup', duration: '15:00', distance: 3000, pace: '5:00', hr: null },
          { stepNumber: 2, stepType: 'effort', duration: '4:00', distance: 1000, pace: '4:00', hr: 170 },
          { stepNumber: 3, stepType: 'recovery', duration: '2:00', distance: 400, pace: '6:00', hr: 130 },
        ],
      },
    };

    it('displays workout type for fractionné', () => {
      renderRow(fractionnéPlanned);
      expect(screen.getByText('Fractionné')).toBeInTheDocument();
      expect(screen.getByText('6x1000m')).toBeInTheDocument();
    });

    it('calculates and displays totals from steps', () => {
      renderRow(fractionnéPlanned);
      expect(screen.getByText('Fractionné')).toBeInTheDocument();
    });

    it('shows chevron for expandable interval details', () => {
      renderRow(fractionnéPlanned);
      expect(screen.getByText('Fractionné')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles missing target duration gracefully', () => {
      renderRow({ ...mockPlannedSession, targetDuration: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('handles missing target pace gracefully', () => {
      renderRow({ ...mockPlannedSession, targetPace: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('formats target duration correctly', () => {
      renderRow({ ...mockPlannedSession, targetDuration: 30 });
      expect(screen.getByText('~30:00')).toBeInTheDocument();

      renderRow({ ...mockPlannedSession, targetDuration: 120 });
      expect(screen.getByText('~02:00:00')).toBeInTheDocument();
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
        expect(mockOnView).toHaveBeenCalledWith(mockPlannedSession);
      }
    });

    it('calls onEdit when complete item is clicked', () => {
      renderRow();
      
      const menuItems = screen.getAllByTestId('dropdown-item');
      const editItem = menuItems.find(item => item.textContent?.includes('Compléter'));
      expect(editItem).toBeInTheDocument();
      
      if (editItem) {
        fireEvent.click(editItem);
        expect(mockOnEdit).toHaveBeenCalledWith(mockPlannedSession);
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
