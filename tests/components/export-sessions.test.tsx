import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportSessions } from '@/components/dashboard/export-sessions';
import { type TrainingSession } from '@/lib/types';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button data-testid="dropdown-item" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe('ExportSessions', () => {
  const mockSessions: TrainingSession[] = [
    {
      id: '1',
      sessionNumber: 1,
      week: 1,
      date: '2024-01-15',
      sessionType: 'Footing',
      duration: '1:00:00',
      distance: 10,
      avgPace: '6:00',
      avgHeartRate: 140,
      comments: 'Bonne séance',
      userId: 'user1',
      status: 'completed',
    },
    {
      id: '2',
      sessionNumber: 2,
      week: 1,
      date: '2024-01-16',
      sessionType: 'Fractionné',
      duration: '0:45:00',
      distance: 8,
      avgPace: '5:30',
      avgHeartRate: 160,
      perceivedExertion: 8,
      intervalStructure: '10x400m',
      comments: 'Dur mais bien',
      userId: 'user1',
      status: 'completed',
    },
  ];

  const plannedSessions: TrainingSession[] = [
    {
      id: '3',
      sessionNumber: 3,
      week: 2,
      date: null,
      sessionType: 'Sortie longue',
      duration: null,
      distance: null,
      avgPace: null,
      avgHeartRate: null,
      comments: '',
      userId: 'user1',
      status: 'planned',
    },
  ];

  it('renders export button', () => {
    render(<ExportSessions sessions={mockSessions} />);
    expect(screen.getByText('Exporter')).toBeInTheDocument();
  });

  it('shows dropdown menu with export options', () => {
    render(<ExportSessions sessions={mockSessions} />);
    const items = screen.getAllByTestId('dropdown-item');
    expect(items.length).toBe(3);
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
  });

  it('button is enabled when there are sessions', () => {
    render(<ExportSessions sessions={mockSessions} />);
    const button = screen.getByRole('button', { name: /Exporter/i });
    expect(button).not.toBeDisabled();
  });

  it('button is disabled when there are no sessions', () => {
    render(<ExportSessions sessions={[]} />);
    const button = screen.getByRole('button', { name: /Exporter/i });
    expect(button).toBeDisabled();
  });

});
