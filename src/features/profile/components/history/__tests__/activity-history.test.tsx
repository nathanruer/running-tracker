import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityHistory } from '../activity-history';

vi.mock('../activity-heatmap', () => ({
  ActivityHeatmap: ({ onDayClick }: { onDayClick: (date: Date, sessions: unknown[]) => void }) => (
    <button type="button" onClick={() => onDayClick(new Date('2024-01-10T00:00:00Z'), [
      { id: '1', sessionType: 'Footing', status: 'completed', duration: '00:30:00', distance: 5, avgPace: '06:00', avgHeartRate: 140, perceivedExertion: 5 },
    ])}>
      heatmap
    </button>
  ),
}));

vi.mock('../calendar-view-inline', () => ({
  CalendarViewInline: ({ onDayClick }: { onDayClick: (date: Date, sessions: unknown[]) => void }) => (
    <button type="button" onClick={() => onDayClick(new Date('2024-01-12T00:00:00Z'), [
      { id: '2', sessionType: 'Fractionné', status: 'planned', targetDuration: 45, targetDistance: 8, targetPace: '05:30', targetHeartRateBpm: 160, targetRPE: 6, intervalDetails: { steps: [] } },
    ])}>
      calendar
    </button>
  ),
}));

vi.mock('@/features/dashboard/components/interval-details-view', () => ({
  IntervalDetailsView: () => <div data-testid="interval-details" />,
}));

describe('ActivityHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles between heatmap and calendar views', async () => {
    const user = userEvent.setup();
    render(<ActivityHistory sessions={[]} />);

    expect(screen.getByText('Heatmap')).toBeInTheDocument();
    await user.click(screen.getByText('Calendrier'));
    expect(screen.getByText('Calendrier')).toBeInTheDocument();
  });

  it('opens dialog with session details from heatmap', async () => {
    const user = userEvent.setup();
    render(<ActivityHistory sessions={[]} />);

    await user.click(screen.getByText('heatmap'));

    expect(screen.getByText(/1 séance/i)).toBeInTheDocument();
    expect(screen.getByText('Footing')).toBeInTheDocument();
    expect(screen.getByText(/Effort perçu/i)).toBeInTheDocument();
  });

  it('opens dialog with planned session details from calendar', async () => {
    const user = userEvent.setup();
    render(<ActivityHistory sessions={[]} />);

    await user.click(screen.getByText('Calendrier'));
    await user.click(screen.getByText('calendar'));

    expect(screen.getByText('Fractionné')).toBeInTheDocument();
    expect(screen.getByText(/Programmée/i)).toBeInTheDocument();
    expect(screen.getByTestId('interval-details')).toBeInTheDocument();
  });

  it('resets scroll position when dialog opens', async () => {
    const user = userEvent.setup();
    render(<ActivityHistory sessions={[]} />);

    await user.click(screen.getByText('heatmap'));

    await waitFor(() => {
      expect(screen.getByText(/1 séance/i)).toBeInTheDocument();
    });
  });

  it('switches to heatmap view when clicking Heatmap button', async () => {
    const user = userEvent.setup();
    render(<ActivityHistory sessions={[]} />);

    await user.click(screen.getByText('Calendrier'));
    expect(screen.getByText(/Calendrier mensuel/i)).toBeInTheDocument();

    await user.click(screen.getByText('Heatmap'));
    expect(screen.getByText(/Vue annuelle/i)).toBeInTheDocument();
  });
});
