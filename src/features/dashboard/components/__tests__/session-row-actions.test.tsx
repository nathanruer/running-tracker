import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionRowActions } from '../session-row-actions';
import type { TrainingSession } from '@/lib/types';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

describe('SessionRowActions', () => {
  const mockSession: TrainingSession = {
    id: '1',
    sessionNumber: 1,
    week: 1,
    date: '2024-01-01',
    sessionType: 'Footing',
    duration: '1:00:00',
    distance: 10,
    avgPace: '6:00',
    avgHeartRate: 150,
    perceivedExertion: 5,
    comments: 'Test session',
    status: 'completed',
    userId: 'user1',
  };

  const mockOnView = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  it('should render dropdown menu trigger', () => {
    render(
      <SessionRowActions
        session={mockSession}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
  });

  it('should call onView when "Voir détails" is clicked', () => {
    render(
      <SessionRowActions
        session={mockSession}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const items = screen.getAllByTestId('dropdown-item');
    const viewButton = items.find(item => item.textContent?.includes('Voir détails'));

    expect(viewButton).toBeDefined();
    fireEvent.click(viewButton!);
    expect(mockOnView).toHaveBeenCalledWith(mockSession);
  });

  it('should call onEdit when "Modifier" is clicked for completed session', () => {
    render(
      <SessionRowActions
        session={mockSession}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isPlanned={false}
      />
    );

    const items = screen.getAllByTestId('dropdown-item');
    const editButton = items.find(item => item.textContent?.includes('Modifier'));

    expect(editButton).toBeDefined();
    fireEvent.click(editButton!);
    expect(mockOnEdit).toHaveBeenCalledWith(mockSession);
  });

  it('should show "Compléter / Modifier" button for planned session', () => {
    const plannedSession = { ...mockSession, status: 'planned' as const };

    render(
      <SessionRowActions
        session={plannedSession}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isPlanned={true}
      />
    );

    const items = screen.getAllByTestId('dropdown-item');
    const completeButton = items.find(item => item.textContent?.includes('Compléter'));

    expect(completeButton).toBeDefined();
    // "Modifier" seul ne devrait pas exister car on affiche "Compléter / Modifier"
    expect(screen.queryByText(/^Modifier$/)).not.toBeInTheDocument();
  });

  it('should call onEdit when "Compléter / Modifier" is clicked for planned session', () => {
    const plannedSession = { ...mockSession, status: 'planned' as const };

    render(
      <SessionRowActions
        session={plannedSession}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isPlanned={true}
      />
    );

    const items = screen.getAllByTestId('dropdown-item');
    const completeButton = items.find(item => item.textContent?.includes('Compléter'));

    expect(completeButton).toBeDefined();
    fireEvent.click(completeButton!);
    expect(mockOnEdit).toHaveBeenCalledWith(plannedSession);
  });

  it('should call onDelete when "Supprimer" is clicked', () => {
    render(
      <SessionRowActions
        session={mockSession}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const items = screen.getAllByTestId('dropdown-item');
    const deleteButton = items.find(item => item.textContent?.includes('Supprimer'));

    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton!);
    expect(mockOnDelete).toHaveBeenCalledWith(mockSession.id);
  });

  it('should render dropdown separators', () => {
    render(
      <SessionRowActions
        session={mockSession}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const separators = screen.getAllByTestId('dropdown-separator');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('should render all action icons', () => {
    render(
      <SessionRowActions
        session={mockSession}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Voir détails')).toBeInTheDocument();
    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });
});
