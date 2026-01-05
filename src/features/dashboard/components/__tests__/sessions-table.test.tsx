import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionsTable } from '../sessions-table';
import type { TrainingSession } from '@/lib/types';

const mockSessions: TrainingSession[] = [
  {
    id: '1',
    sessionNumber: 1,
    week: 1,
    date: '2024-01-01',
    sessionType: 'Endurance',
    duration: '00:30:00',
    distance: 5,
    avgPace: '06:00',
    avgHeartRate: 140,
    perceivedExertion: 5,
    comments: 'Good run',
    status: 'completed',
  } as TrainingSession,
  {
    id: '2',
    sessionNumber: 2,
    week: 1,
    date: '2024-01-03',
    sessionType: 'Fractionné',
    duration: '00:45:00',
    distance: 8,
    avgPace: '05:30',
    avgHeartRate: 160,
    perceivedExertion: 8,
    comments: 'Hard session',
    status: 'completed',
  } as TrainingSession,
  {
    id: '3',
    sessionNumber: 3,
    week: 2,
    date: '2024-01-05',
    sessionType: 'Récupération',
    duration: null,
    distance: null,
    avgPace: null,
    avgHeartRate: null,
    perceivedExertion: null,
    comments: 'Easy',
    status: 'planned',
    targetDuration: 20,
    targetDistance: 3,
    targetPace: '06:30',
    targetHeartRateBpm: '130',
    targetRPE: 3,
  } as TrainingSession,
];

describe('SessionsTable', () => {
  const mockOnTypeChange = vi.fn();
  const mockOnViewModeChange = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnBulkDelete = vi.fn();
  const mockOnNewSession = vi.fn();
  const mockOnView = vi.fn();

  const defaultActions = {
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onBulkDelete: mockOnBulkDelete,
    onNewSession: mockOnNewSession,
    onView: mockOnView,
  };

  const defaultProps = {
    sessions: mockSessions,
    availableTypes: ['Endurance', 'Fractionné', 'Récupération'],
    selectedType: 'all',
    onTypeChange: mockOnTypeChange,
    viewMode: 'all' as const,
    onViewModeChange: mockOnViewModeChange,
    actions: defaultActions,
    initialLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table with sessions', () => {
    render(<SessionsTable {...defaultProps} />);

    expect(screen.getByText('Historique des séances')).toBeInTheDocument();
    expect(screen.getByText('Good run')).toBeInTheDocument();
    expect(screen.getByText('Hard session')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('should render loading skeleton when initialLoading is true', () => {
    render(<SessionsTable {...defaultProps} initialLoading={true} />);

    const skeletons = screen.getAllByRole('row').filter(row => {
      const cells = within(row).queryAllByRole('cell');
      return cells.length > 0 && cells[0].querySelector('.animate-pulse');
    });

    expect(skeletons.length).toBe(5);
  });

  it('should render "Ajouter une séance" button when onNewSession is provided', () => {
    render(<SessionsTable {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /ajouter une séance/i });
    expect(addButton).toBeInTheDocument();
  });

  it('should not render "Ajouter une séance" button when onNewSession is not provided', () => {
    const actionsWithoutNewSession = { ...defaultActions, onNewSession: undefined };
    render(<SessionsTable {...defaultProps} actions={actionsWithoutNewSession} />);

    expect(screen.queryByRole('button', { name: /ajouter une séance/i })).not.toBeInTheDocument();
  });

  it('should call onNewSession when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /ajouter une séance/i });
    await user.click(addButton);

    expect(mockOnNewSession).toHaveBeenCalledTimes(1);
  });

  it('should select individual session', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select all", so skip it
    const firstSessionCheckbox = checkboxes[1];

    await user.click(firstSessionCheckbox);

    expect(screen.getByText('1 séance sélectionnée')).toBeInTheDocument();
  });

  it('should select all sessions', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /sélectionner toutes les séances/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByText('3 séances sélectionnées')).toBeInTheDocument();
  });

  it('should clear selection when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    // Select all
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /sélectionner toutes les séances/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByText('3 séances sélectionnées')).toBeInTheDocument();

    // Clear selection
    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(screen.queryByText(/séances sélectionnées/)).not.toBeInTheDocument();
  });

  it('should open bulk delete dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    // Select sessions
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /sélectionner toutes les séances/i });
    await user.click(selectAllCheckbox);

    // Click delete button
    const deleteButton = screen.getByTestId('bulk-delete-button');
    await user.click(deleteButton);

    // Dialog should appear
    expect(screen.getByText('Supprimer les séances sélectionnées')).toBeInTheDocument();
    expect(screen.getByText(/Êtes-vous sûr de vouloir supprimer 3 séances/)).toBeInTheDocument();
  });

  it('should call onBulkDelete when confirming deletion', async () => {
    const user = userEvent.setup();
    mockOnBulkDelete.mockResolvedValue(undefined);

    render(<SessionsTable {...defaultProps} />);

    // Select sessions
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /sélectionner toutes les séances/i });
    await user.click(selectAllCheckbox);

    // Open dialog
    const deleteButton = screen.getByTestId('bulk-delete-button');
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /^supprimer$/i });
    await user.click(confirmButton);

    expect(mockOnBulkDelete).toHaveBeenCalledWith(['1', '2', '3']);
  });

  it('should sort by duration when clicking duration header', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const durationHeader = screen.getByRole('button', { name: /durée/i });
    await user.click(durationHeader);

    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1);

    // Adaptive format: MM:SS for durations < 60min
    expect(within(dataRows[0]).getByText('45:00')).toBeInTheDocument();
  });

  it('should toggle sort direction on multiple clicks', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const durationHeader = screen.getByRole('button', { name: /durée/i });

    // First click - descending (longest first)
    await user.click(durationHeader);
    let rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('45:00')).toBeInTheDocument();

    // Second click - ascending (shortest first)
    await user.click(durationHeader);
    rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Récupération')).toBeInTheDocument();

    // Third click - no sort (back to original order)
    await user.click(durationHeader);
    rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('30:00')).toBeInTheDocument();
  });

  it('should render type filter select', () => {
    render(<SessionsTable {...defaultProps} />);

    expect(screen.getByText('Tous les types')).toBeInTheDocument();
  });

  it('should render view mode select', () => {
    render(<SessionsTable {...defaultProps} />);

    expect(screen.getByText('Tout afficher')).toBeInTheDocument();
  });

  it('should handle empty sessions array', () => {
    render(<SessionsTable {...defaultProps} sessions={[]} />);

    expect(screen.getByText('Historique des séances')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(1);
  });

  it('should show correct session types in table', () => {
    render(<SessionsTable {...defaultProps} />);

    expect(screen.getByText('Endurance')).toBeInTheDocument();
    expect(screen.getByText('Fractionné')).toBeInTheDocument();
    expect(screen.getByText('Récupération')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(4);
  });
});
