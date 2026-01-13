import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActivityHeatmap } from '../activity-heatmap';
import { type TrainingSession } from '@/lib/types';

const mockSessions: TrainingSession[] = [
  {
    id: '1',
    date: new Date().toISOString(),
    status: 'completed',
    distance: 10,
    sessionType: 'Endurance',
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
    
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByRole('button', { name: currentYear })).toBeInTheDocument();
  });
});
