import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UpcomingSessions } from '../upcoming-sessions';
import type { TrainingSession } from '@/lib/types';

function makePlannedSession(
  overrides: Partial<Extract<TrainingSession, { status: 'planned' }>> = {}
): TrainingSession {
  return {
    id: 's1',
    userId: 'u1',
    sessionNumber: 1,
    week: null,
    status: 'planned',
    date: null,
    plannedDate: '2026-09-02T00:00:00.000Z',
    sessionType: 'VMA',
    comments: '',
    targetPace: '04:30',
    targetDuration: 45,
    targetDistance: 8,
    targetRPE: 8,
    intervalDetails: null,
    ...overrides,
  };
}

describe('UpcomingSessions', () => {
  it('renders nothing when there are no sessions', () => {
    const { container } = render(
      <UpcomingSessions sessions={[]} onComplete={vi.fn()} onView={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders planned session cards with targets and RPE', () => {
    render(
      <UpcomingSessions
        sessions={[makePlannedSession()]}
        onComplete={vi.fn()}
        onView={vi.fn()}
      />
    );

    expect(screen.getByText('À venir')).toBeInTheDocument();
    expect(screen.getByText('VMA')).toBeInTheDocument();
    expect(screen.getByText('45 min · 8 km · 04:30/km')).toBeInTheDocument();
    expect(screen.getByText('RPE cible 8/10')).toBeInTheDocument();
  });

  it('shows "À planifier" when plannedDate is missing', () => {
    render(
      <UpcomingSessions
        sessions={[makePlannedSession({ plannedDate: null })]}
        onComplete={vi.fn()}
        onView={vi.fn()}
      />
    );

    expect(screen.getByText('À planifier')).toBeInTheDocument();
  });

  it('calls onComplete without triggering onView when clicking Compléter', () => {
    const onComplete = vi.fn();
    const onView = vi.fn();
    const session = makePlannedSession();
    render(
      <UpcomingSessions sessions={[session]} onComplete={onComplete} onView={onView} />
    );

    fireEvent.click(screen.getByText('Compléter'));

    expect(onComplete).toHaveBeenCalledWith(session);
    expect(onView).not.toHaveBeenCalled();
  });

  it('calls onView when clicking the card', () => {
    const onView = vi.fn();
    const session = makePlannedSession();
    render(
      <UpcomingSessions sessions={[session]} onComplete={vi.fn()} onView={onView} />
    );

    fireEvent.click(screen.getByTestId('upcoming-session-card'));

    expect(onView).toHaveBeenCalledWith(session);
  });
});
