import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlannedSessionRow } from '@/components/dashboard/planned-session-row';
import { type TrainingSession } from '@/lib/types';

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, className }: any) => <tr className={className}>{children}</tr>,
  TableCell: ({ children, className }: any) => <td className={className}>{children}</td>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
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
    intervalStructure: null,
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

  it('renders planned session data correctly', () => {
    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={mockPlannedSession}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Sortie longue')).toBeInTheDocument();
    expect(screen.getByText('~01:30:00')).toBeInTheDocument();
    expect(screen.getByText('~18 km')).toBeInTheDocument();
    expect(screen.getByText('~5:00')).toBeInTheDocument();
    expect(screen.getByText('Z2 bpm')).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument();
    expect(screen.getByText('Préparation semi-marathon')).toBeInTheDocument();
  });

  it('displays "À planifier" when date is null', () => {
    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={mockPlannedSession}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('À planifier')).toBeInTheDocument();
  });

  it('displays date when present', () => {
    const sessionWithDate = {
      ...mockPlannedSession,
      date: '2024-01-20T10:00:00.000Z',
    };

    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={sessionWithDate}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('20/01/2024')).toBeInTheDocument();
  });

  it('displays interval structure when present', () => {
    const sessionWithIntervals = {
      ...mockPlannedSession,
      sessionType: 'Fractionné',
      intervalStructure: '6x800m',
    };

    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={sessionWithIntervals}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('6x800m')).toBeInTheDocument();
  });

  it('displays dash when targetDuration is null', () => {
    const sessionNoTarget = {
      ...mockPlannedSession,
      targetDuration: undefined,
    };

    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={sessionNoTarget}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('displays dash when targetDistance is null', () => {
    const sessionNoDistance = {
      ...mockPlannedSession,
      targetDistance: undefined,
    };

    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={sessionNoDistance}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('calls onEdit when complete button is clicked', () => {
    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={mockPlannedSession}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockPlannedSession);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={mockPlannedSession}
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

  it('formats target duration correctly for different values', () => {
    const testCases = [
      { targetDuration: 30, expected: '~00:30:00' },
      { targetDuration: 60, expected: '~01:00:00' },
      { targetDuration: 125, expected: '~02:05:00' },
    ];

    testCases.forEach(({ targetDuration, expected }) => {
      const session = { ...mockPlannedSession, targetDuration };
      const { unmount } = render(
        <table>
          <tbody>
            <PlannedSessionRow
              session={session}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
            />
          </tbody>
        </table>
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });

  it('handles null week', () => {
    const sessionNoWeek = { ...mockPlannedSession, week: null };

    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={sessionNoWeek}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('uses targetHeartRateBpm when available', () => {
    const sessionWithBpm = {
      ...mockPlannedSession,
      targetHeartRateBpm: '140-150',
      targetHeartRateZone: undefined,
    };

    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={sessionWithBpm}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('140-150 bpm')).toBeInTheDocument();
  });
});
