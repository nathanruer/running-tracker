import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalendarViewInline } from '../calendar-view-inline';

describe('CalendarViewInline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onDayClick when day has sessions', async () => {
    const onDayClick = vi.fn();
    render(
      <CalendarViewInline
        sessions={[
          { id: '1', date: '2024-01-10', sessionType: 'Footing', status: 'completed' } as never,
        ]}
        onDayClick={onDayClick}
      />
    );

    const daySpan = screen.getByText('10');
    const dayButton = daySpan.closest('button');
    expect(dayButton).not.toBeNull();
    fireEvent.click(dayButton!);

    expect(onDayClick).toHaveBeenCalled();
  });

  it('does not call onDayClick when day has no sessions', async () => {
    const onDayClick = vi.fn();
    render(
      <CalendarViewInline
        sessions={[]}
        onDayClick={onDayClick}
      />
    );

    const daySpan = screen.getByText('5');
    const dayButton = daySpan.closest('button');
    if (dayButton) fireEvent.click(dayButton);

    expect(onDayClick).not.toHaveBeenCalled();
  });

  it('navigates to next month', async () => {
    render(
      <CalendarViewInline
        sessions={[]}
        onDayClick={vi.fn()}
      />
    );

    expect(screen.getByText(/JANVIER 2024/i)).toBeInTheDocument();
    const nextLabel = screen.getByText('Mois suivant');
    const nextButton = nextLabel.closest('button');
    fireEvent.click(nextButton!);
    expect(screen.getByText(/FÉVRIER 2024/i)).toBeInTheDocument();
  });
  it('does not render "-" when sessionType is null', () => {
    render(
      <CalendarViewInline
        sessions={[
          { id: '1', date: '2024-01-10', sessionType: null, status: 'completed' } as never,
        ]}
        onDayClick={vi.fn()}
      />
    );

    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });
});
