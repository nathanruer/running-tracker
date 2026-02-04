import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionsTable } from '../sessions-table';
import type { TrainingSession } from '@/lib/types';
import type { SortConfig } from '@/lib/domain/sessions';

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
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnBulkDelete = vi.fn();
  const mockOnNewSession = vi.fn();
  const mockOnView = vi.fn();
  const mockOnSort = vi.fn();

  const defaultActions = {
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onBulkDelete: mockOnBulkDelete,
    onNewSession: mockOnNewSession,
    onView: mockOnView,
  };

  const defaultSortConfig: SortConfig = [];

  const mockOnSearchChange = vi.fn();
  const mockOnPeriodChange = vi.fn();

  const defaultProps = {
    sessions: mockSessions,
    availableTypes: ['Endurance', 'Fractionné', 'Récupération'],
    selectedType: 'all',
    onTypeChange: mockOnTypeChange,
    actions: defaultActions,
    initialLoading: false,
    totalCount: mockSessions.length,
    hasMore: false,
    isFetchingNextPage: false,
    onLoadMore: vi.fn(),
    sortConfig: defaultSortConfig,
    onSort: mockOnSort,
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    period: 'all' as const,
    onPeriodChange: mockOnPeriodChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table with sessions', () => {
    render(<SessionsTable {...defaultProps} />);

    expect(screen.getByText('Historique')).toBeInTheDocument();
    expect(screen.getByText('Good run')).toBeInTheDocument();
    expect(screen.getByText('Hard session')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('should render loading skeleton when initialLoading is true', () => {
    render(<SessionsTable {...defaultProps} initialLoading={true} sessions={[]} />);

    const skeletons = screen.getAllByRole('row').filter(row => {
      const cells = within(row).queryAllByRole('cell');
      return cells.length > 0 && cells[0].querySelector('.animate-pulse');
    });

    expect(skeletons.length).toBe(6);
  });

  it('should render "Nouvelle séance" button when onNewSession is provided', () => {
    render(<SessionsTable {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /nouvelle séance/i });
    expect(addButton).toBeInTheDocument();
  });

  it('should not render "Nouvelle séance" button when onNewSession is not provided', () => {
    const actionsWithoutNewSession = { ...defaultActions, onNewSession: undefined };
    render(<SessionsTable {...defaultProps} actions={actionsWithoutNewSession} />);

    expect(screen.queryByRole('button', { name: /nouvelle séance/i })).not.toBeInTheDocument();
  });

  it('should call onNewSession when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /nouvelle séance/i });
    await user.click(addButton);

    expect(mockOnNewSession).toHaveBeenCalledTimes(1);
  });

  it('should select individual session', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstSessionCheckbox = checkboxes[1];

    await user.click(firstSessionCheckbox);

    expect(screen.getByTestId('selection-count')).toHaveTextContent('1');
    expect(screen.getByText(/Sélectionnée/i)).toBeInTheDocument();
  });

  it('should select all sessions', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /sélectionner toutes les séances/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByTestId('selection-count')).toHaveTextContent('3');
    expect(screen.getByText(/Sélectionnées/i)).toBeInTheDocument();
  });

  it('should clear selection when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /sélectionner toutes les séances/i });
    await user.click(selectAllCheckbox);

    expect(screen.getByTestId('selection-count')).toHaveTextContent('3');

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(screen.queryByTestId('selection-count')).not.toBeInTheDocument();
  });

  it('should open bulk delete dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /sélectionner toutes les séances/i });
    await user.click(selectAllCheckbox);

    const deleteButton = screen.getByTestId('bulk-delete-button');
    await user.click(deleteButton);

    expect(screen.getByText('Supprimer les séances sélectionnées')).toBeInTheDocument();
    expect(screen.getByText(/Êtes-vous sûr de vouloir supprimer 3 séances/)).toBeInTheDocument();
  });

  it('should call onBulkDelete when confirming deletion', async () => {
    const user = userEvent.setup();
    mockOnBulkDelete.mockResolvedValue(undefined);

    render(<SessionsTable {...defaultProps} />);

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /sélectionner toutes les séances/i });
    await user.click(selectAllCheckbox);

    const deleteButton = screen.getByTestId('bulk-delete-button');
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: /confirmer la suppression/i });
    await user.click(confirmButton);

    expect(mockOnBulkDelete).toHaveBeenCalledWith(['1', '2', '3']);
  });

  it('should call onSort when clicking duration header', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const durationHeader = screen.getByRole('button', { name: /durée/i });
    await user.click(durationHeader);

    expect(mockOnSort).toHaveBeenCalledWith('duration', false);
  });

  it('should call onSort with shift key when Shift+clicking', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const distanceHeader = screen.getByRole('button', { name: /dist/i });
    await user.keyboard('{Shift>}');
    await user.click(distanceHeader);
    await user.keyboard('{/Shift}');

    expect(mockOnSort).toHaveBeenCalledWith('distance', true);
  });

  it('should display sort indicators when sortConfig is set', () => {
    const sortConfig: SortConfig = [{ column: 'duration', direction: 'desc' }];
    render(<SessionsTable {...defaultProps} sortConfig={sortConfig} />);

    const durationHeader = screen.getByRole('button', { name: /durée/i });
    expect(within(durationHeader).getByText('Durée')).toHaveClass('text-foreground');
  });

  it('should render type filter select', () => {
    render(<SessionsTable {...defaultProps} />);

    expect(screen.getByText('Tous les types')).toBeInTheDocument();
  });

  it('should render view mode select', () => {
    render(<SessionsTable {...defaultProps} />);

    expect(screen.getByText('Tous les types')).toBeInTheDocument();
  });

  it('should render total count badge', () => {
    render(<SessionsTable {...defaultProps} totalCount={50} />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search input', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionsTable {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/chercher/i);
    await user.type(searchInput, 'Hard');

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(mockOnSearchChange).toHaveBeenCalled();
  });

  it('should handle empty sessions array', () => {
    render(<SessionsTable {...defaultProps} sessions={[]} />);

    expect(screen.getByText('Historique')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(2);
    expect(screen.getByText('Aucun résultat trouvé')).toBeInTheDocument();
  });

  it('should show correct session types in table', () => {
    render(<SessionsTable {...defaultProps} />);

    expect(screen.getByText('Endurance')).toBeInTheDocument();
    expect(screen.getByText('Fractionné')).toBeInTheDocument();
    expect(screen.getByText('Récupération')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(4);
  });

  it('should render and handle options menu', async () => {
    const user = userEvent.setup();
    render(<SessionsTable {...defaultProps} />);

    const optionsTrigger = screen.getByTitle('Actions de données');
    expect(optionsTrigger).toBeInTheDocument();

    await user.click(optionsTrigger);

    expect(screen.getAllByText('Exporter').length).toBeGreaterThan(0);
    
    const importItem = screen.getByText(/Importer \(Bientôt\)/i);
    expect(importItem).toBeInTheDocument();
  });

  it('should clear active filters', async () => {
    const user = userEvent.setup();
    render(
      <SessionsTable
        {...defaultProps}
        selectedType="Fractionné"
        searchQuery="test"
        period="week"
      />
    );

    const clearButton = screen.getByRole('button', { name: /effacer/i });
    await user.click(clearButton);

    expect(mockOnTypeChange).toHaveBeenCalledWith('all');
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
    expect(mockOnPeriodChange).toHaveBeenCalledWith('all');
  });

  it('should render active filter chips and allow removing one', async () => {
    const user = userEvent.setup();
    render(
      <SessionsTable
        {...defaultProps}
        selectedType="Fractionné"
        searchQuery="tempo"
        period="week"
      />
    );

    expect(screen.getByTestId('active-filter-type')).toBeInTheDocument();
    expect(screen.getByTestId('active-filter-period')).toBeInTheDocument();
    expect(screen.getByTestId('active-filter-search')).toBeInTheDocument();

    await user.click(screen.getByTestId('active-filter-type'));
    expect(mockOnTypeChange).toHaveBeenCalledWith('all');
  });

  it('should call onLoadMore when clicking load more button', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    render(
      <SessionsTable
        {...defaultProps}
        hasMore={true}
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
      />
    );

    const loadMoreButton = screen.getByRole('button', { name: /afficher plus/i });
    await user.click(loadMoreButton);

    expect(onLoadMore).toHaveBeenCalled();
  });
});
