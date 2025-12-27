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

describe('PlannedSessionRow', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

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
    targetHeartRateZone: 'Z2',
    targetRPE: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRow = (session: TrainingSession = mockPlannedSession) => {
    return render(
      <table>
        <tbody>
          <PlannedSessionRow session={session} onEdit={mockOnEdit} onDelete={mockOnDelete} />
        </tbody>
      </table>
    );
  };

  describe('Data rendering', () => {
    it('renders all planned session data correctly', () => {
      renderRow();

      // Basic info
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Sortie longue')).toBeInTheDocument();

      // Target metrics (with ~ prefix)
      expect(screen.getByText('~01:30:00')).toBeInTheDocument();
      expect(screen.getByText('~18.00')).toBeInTheDocument();
      expect(screen.getByText('km')).toBeInTheDocument();
      expect(screen.getByText('~05:00')).toBeInTheDocument();
      expect(screen.getByText('mn/km')).toBeInTheDocument();
      expect(screen.getByText('~Z2')).toBeInTheDocument();
      expect(screen.getByText('bpm')).toBeInTheDocument();
      expect(screen.getByText('5/10')).toBeInTheDocument();
      expect(screen.getByText('Préparation semi-marathon')).toBeInTheDocument();
    });

    it('displays interval structure when present', () => {
      const sessionWithIntervals: TrainingSession = {
        ...mockPlannedSession,
        sessionType: 'Fractionné',
        intervalDetails: {
          workoutType: '10x400m',
          steps: [],
          repetitionCount: null,
          effortDuration: null,
          recoveryDuration: null,
          effortDistance: null,
          recoveryDistance: null,
          targetEffortPace: null,
          targetEffortHR: null,
          targetRecoveryPace: null,
        },
      };

      renderRow(sessionWithIntervals);

      expect(screen.getByText('Fractionné')).toBeInTheDocument();
      expect(screen.getByText('10x400m')).toBeInTheDocument();
    });

    it('uses targetHeartRateBpm when available instead of zone', () => {
      const sessionWithBPM: TrainingSession = {
        ...mockPlannedSession,
        targetHeartRateZone: null,
        targetHeartRateBpm: '150',
      };

      renderRow(sessionWithBPM);
      expect(screen.getByText('~150')).toBeInTheDocument();
      expect(screen.getByText('bpm')).toBeInTheDocument();
    });
  });

  describe('Date handling', () => {
    it('displays "À planifier" when date is null', () => {
      renderRow();
      expect(screen.getByText('À planifier')).toBeInTheDocument();
    });

    it('displays formatted date when present', () => {
      const sessionWithDate: TrainingSession = {
        ...mockPlannedSession,
        date: '2024-01-15T10:00:00.000Z',
      };

      renderRow(sessionWithDate);
      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles null values gracefully', () => {
      // Null target duration
      renderRow({ ...mockPlannedSession, targetDuration: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);

      // Null target distance
      renderRow({ ...mockPlannedSession, targetDistance: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);

      // Null week
      renderRow({ ...mockPlannedSession, week: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('formats target duration correctly for different values', () => {
      renderRow({ ...mockPlannedSession, targetDuration: 30 });
      expect(screen.getByText('~00:30:00')).toBeInTheDocument();

      renderRow({ ...mockPlannedSession, targetDuration: 120 });
      expect(screen.getByText('~02:00:00')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('calls onEdit when complete button is clicked', () => {
      renderRow();

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockPlannedSession);
    });

    it('calls onDelete when delete button is clicked', () => {
      renderRow();

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });
  });
});
