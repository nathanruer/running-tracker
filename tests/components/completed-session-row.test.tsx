import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompletedSessionRow } from '@/components/dashboard/completed-session-row';
import { type TrainingSession } from '@/lib/types';

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => <tr className={className}>{children}</tr>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => <td className={className}>{children}</td>,
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

  it('renders session data correctly', () => {
    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={mockSession}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    expect(screen.getByText('Footing')).toBeInTheDocument();
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
        actualEffortPace: null,
        actualEffortHR: null,
        actualRecoveryPace: null,
      },
    };

    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={sessionWithIntervals}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('Fractionné')).toBeInTheDocument();
    expect(screen.getByText('10x400m')).toBeInTheDocument();
  });

  it('displays dash when perceivedExertion is null', () => {
    const sessionWithoutRPE = {
      ...mockSession,
      perceivedExertion: null,
    };

    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={sessionWithoutRPE}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('applies correct color for low RPE (green)', () => {
    const sessionLowRPE = { ...mockSession, perceivedExertion: 2 };

    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={sessionLowRPE}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const rpeElement = screen.getByText('2/10');
    expect(rpeElement).toHaveClass('text-green-500');
  });

  it('applies correct color for medium RPE (yellow)', () => {
    const sessionMediumRPE = { ...mockSession, perceivedExertion: 5 };

    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={sessionMediumRPE}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const rpeElement = screen.getByText('5/10');
    expect(rpeElement).toHaveClass('text-yellow-500');
  });

  it('applies correct color for high RPE (red)', () => {
    const sessionHighRPE = { ...mockSession, perceivedExertion: 10 };

    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={sessionHighRPE}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const rpeElement = screen.getByText('10/10');
    expect(rpeElement).toHaveClass('text-red-500');
    expect(rpeElement).toHaveClass('font-bold');
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={mockSession}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockSession);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={mockSession}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('handles null week', () => {
    const sessionNoWeek = { ...mockSession, week: null };

    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={sessionNoWeek}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('handles null date', () => {
    const sessionNoDate = { ...mockSession, date: null };

    render(
      <table>
        <tbody>
          <CompletedSessionRow
            session={sessionNoDate}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });
});
