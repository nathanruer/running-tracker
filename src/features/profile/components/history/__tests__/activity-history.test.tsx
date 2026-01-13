import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ActivityHistory } from '../activity-history';
import { type TrainingSession } from '@/lib/types';

const mockSessions: TrainingSession[] = [];

describe('ActivityHistory', () => {
  it('should render heatmap by default', () => {
    render(<ActivityHistory sessions={mockSessions} />);
    
    expect(screen.getByText(/historique d'activité/i)).toBeInTheDocument();
    expect(screen.getByText(/vue annuelle de votre activité/i)).toBeInTheDocument();
  });

  it('should switch to calendar view when clicked', async () => {
    const user = userEvent.setup();
    render(<ActivityHistory sessions={mockSessions} />);
    
    const calendarButton = screen.getByRole('button', { name: /calendrier/i });
    await user.click(calendarButton);
    
    expect(screen.getByText(/calendrier mensuel détaillé/i)).toBeInTheDocument();
  });

  it('should toggle back to heatmap', async () => {
    const user = userEvent.setup();
    render(<ActivityHistory sessions={mockSessions} />);
    
    const calendarButton = screen.getByRole('button', { name: /calendrier/i });
    await user.click(calendarButton);
    
    const heatmapButton = screen.getByRole('button', { name: /heatmap/i });
    await user.click(heatmapButton);
    
    expect(screen.getByText(/vue annuelle de votre activité/i)).toBeInTheDocument();
  });
});
