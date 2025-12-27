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

describe('CompletedSessionRow', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

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
          <CompletedSessionRow session={session} onEdit={mockOnEdit} onDelete={mockOnDelete} />
        </tbody>
      </table>
    );
  };

  describe('Data rendering', () => {
    it('renders all session data correctly', () => {
      renderRow();

      // Basic session info
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
      expect(screen.getByText('Footing')).toBeInTheDocument();

      // Metrics
      expect(screen.getByText('1:00:00')).toBeInTheDocument();
      expect(screen.getByText('10.50')).toBeInTheDocument();
      expect(screen.getByText('km')).toBeInTheDocument();
      expect(screen.getByText('5:42')).toBeInTheDocument();
      expect(screen.getByText('mn/km')).toBeInTheDocument();
      expect(screen.getByText('145')).toBeInTheDocument();
      expect(screen.getByText('bpm')).toBeInTheDocument();
      expect(screen.getByText('6/10')).toBeInTheDocument();
      expect(screen.getByText('Bonne séance de récupération')).toBeInTheDocument();
    });

    it('displays interval structure when present', () => {
      const sessionWithIntervals: TrainingSession = {
        ...mockSession,
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
  });

  describe('RPE coloring', () => {
    it('applies correct colors based on RPE value', () => {
      // Low RPE (1-3) - green
      const { rerender: rerenderLow } = renderRow({ ...mockSession, perceivedExertion: 2 });
      expect(screen.getByText('2/10')).toHaveClass('text-green-500');

      // Medium RPE (4-6) - yellow
      rerenderLow(
        <table>
          <tbody>
            <CompletedSessionRow
              session={{ ...mockSession, perceivedExertion: 5 }}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
            />
          </tbody>
        </table>
      );
      expect(screen.getByText('5/10')).toHaveClass('text-yellow-500');

      // High RPE (7-10) - red, bold
      rerenderLow(
        <table>
          <tbody>
            <CompletedSessionRow
              session={{ ...mockSession, perceivedExertion: 10 }}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
            />
          </tbody>
        </table>
      );
      const highRPE = screen.getByText('10/10');
      expect(highRPE).toHaveClass('text-red-500');
      expect(highRPE).toHaveClass('font-bold');
    });
  });

  describe('Edge cases', () => {
    it('handles null values gracefully', () => {
      // Null RPE
      renderRow({ ...mockSession, perceivedExertion: null });
      expect(screen.getByText('-')).toBeInTheDocument();

      // Null week
      renderRow({ ...mockSession, week: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);

      // Null date
      renderRow({ ...mockSession, date: null });
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  describe('Actions', () => {
    it('calls onEdit when edit button is clicked', () => {
      renderRow();

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockSession);
    });

    it('calls onDelete when delete button is clicked', () => {
      renderRow();

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });
  });
});
