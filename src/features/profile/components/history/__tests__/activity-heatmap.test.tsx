import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ActivityHeatmap } from '../activity-heatmap';
import { type TrainingSession } from '@/lib/types';

const currentYear = new Date().getFullYear();

const mockSessions: TrainingSession[] = [
  {
    id: '1',
    date: new Date().toISOString(),
    status: 'completed',
    distance: 10,
    sessionType: 'Endurance',
  } as TrainingSession,
];

const mockSessionsMultiYear: TrainingSession[] = [
  {
    id: '1',
    date: new Date().toISOString(),
    status: 'completed',
    distance: 10,
    sessionType: 'Endurance',
  } as TrainingSession,
  {
    id: '2',
    date: new Date(currentYear - 1, 5, 15).toISOString(),
    status: 'completed',
    distance: 8,
    sessionType: 'Tempo',
  } as TrainingSession,
];

describe('ActivityHeatmap', () => {
  it('should render the heatmap card', () => {
    render(<ActivityHeatmap sessions={mockSessions} onDayClick={vi.fn()} />);

    expect(screen.getByText(/activités en/i)).toBeInTheDocument();
    expect(screen.getByText(/km courus/i)).toBeInTheDocument();
  });

  it('should render month labels', () => {
    render(<ActivityHeatmap sessions={mockSessions} onDayClick={vi.fn()} />);

    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Déc')).toBeInTheDocument();
  });

  it('should render year selector', () => {
    render(<ActivityHeatmap sessions={mockSessions} onDayClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: currentYear.toString() })).toBeInTheDocument();
  });

  it('should call onDayClick when clicking on a day with sessions', async () => {
    const onDayClick = vi.fn();
    render(<ActivityHeatmap sessions={mockSessions} onDayClick={onDayClick} />);

    const dayButtons = screen.getAllByRole('button').filter(
      (btn) => !btn.textContent || !btn.textContent.match(/^\d{4}$/)
    );

    const buttonWithSession = dayButtons.find(btn => {
      const classes = btn.className;
      return classes.includes('violet') && !classes.includes('transparent');
    });

    if (buttonWithSession) {
      await userEvent.click(buttonWithSession);
      expect(onDayClick).toHaveBeenCalledWith(expect.any(Date), expect.any(Array));
    }
  });

  it('should not call onDayClick when clicking on a day without sessions', async () => {
    const onDayClick = vi.fn();
    render(<ActivityHeatmap sessions={mockSessions} onDayClick={onDayClick} />);

    const dayButtons = screen.getAllByRole('button').filter(
      (btn) => !btn.textContent || !btn.textContent.match(/^\d{4}$/)
    );

    const emptyDayButton = dayButtons.find(btn => {
      const classes = btn.className;
      return classes.includes('muted') && !classes.includes('violet');
    });

    if (emptyDayButton) {
      await userEvent.click(emptyDayButton);
      expect(onDayClick).not.toHaveBeenCalled();
    }
  });

  it('should change selected year when clicking on a different year button', async () => {
    const user = userEvent.setup();
    render(<ActivityHeatmap sessions={mockSessionsMultiYear} onDayClick={vi.fn()} />);

    const prevYearButton = screen.getByRole('button', { name: (currentYear - 1).toString() });
    expect(prevYearButton).toBeInTheDocument();

    await user.click(prevYearButton);

    expect(screen.getByText(new RegExp(`activités en ${currentYear - 1}`, 'i'))).toBeInTheDocument();
  });

  it('should not call onDayClick when onDayClick is not provided', async () => {
    render(<ActivityHeatmap sessions={mockSessions} />);

    const dayButtons = screen.getAllByRole('button').filter(
      (btn) => !btn.textContent || !btn.textContent.match(/^\d{4}$/)
    );

    const buttonWithSession = dayButtons.find(btn => {
      const classes = btn.className;
      return classes.includes('violet') && !classes.includes('transparent');
    });

    if (buttonWithSession) {
      fireEvent.click(buttonWithSession);
    }
  });
});
