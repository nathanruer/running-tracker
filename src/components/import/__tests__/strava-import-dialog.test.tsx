import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { StravaImportDialog } from '../strava-import-dialog';
import { QueryClient } from '@tanstack/react-query';
import type { StravaActivity } from '../hooks/use-strava-activities';

const mockHandleError = vi.fn();
const mockHandleSuccess = vi.fn();
const mockHandleWarning = vi.fn();

vi.mock('@/hooks/use-api-error-handler', () => ({
  useApiErrorHandler: () => ({
    handleError: mockHandleError,
    handleSuccess: mockHandleSuccess,
    handleWarning: mockHandleWarning,
  }),
}));

const mockActivities: StravaActivity[] = [
  {
    id: 1,
    name: 'Morning Run',
    distance: 10000,
    moving_time: 3600,
    start_date_local: '2024-01-15T08:00:00',
    type: 'Run',
    average_heartrate: 145,
    max_heartrate: 165,
  },
  {
    id: 2,
    name: 'Afternoon Tempo',
    distance: 8000,
    moving_time: 2400,
    start_date_local: '2024-01-16T17:00:00',
    type: 'Run',
    average_heartrate: 160,
    max_heartrate: 175,
  },
];

const mockUseStravaActivities = vi.fn();

vi.mock('../hooks/use-strava-activities', () => ({
  useStravaActivities: (open: boolean) => mockUseStravaActivities(open),
}));

vi.mock('@/hooks/use-table-sort', () => ({
  useTableSort: () => ({
    handleSort: vi.fn(),
    SortIcon: () => null,
    defaultComparator: () => mockActivities,
    sortColumn: null,
  }),
}));

const mockUseTableSelection = vi.fn();

vi.mock('@/hooks/use-table-selection', () => ({
  useTableSelection: (...args: unknown[]) => mockUseTableSelection(...args),
}));

vi.mock('@/lib/services/api-client', () => ({
  bulkImportSessions: vi.fn(),
}));

global.fetch = vi.fn();

const defaultMockSelection = {
  selectedIndices: new Set<number>(),
  toggleSelect: vi.fn(),
  toggleSelectAll: vi.fn(),
  clearSelection: vi.fn(),
  selectIndices: vi.fn(),
  getSelectedItems: vi.fn(() => []),
  getSelectedIndices: vi.fn(() => []),
  isSelected: vi.fn(() => false),
  isAllSelected: vi.fn(() => false),
  isSomeSelected: vi.fn(() => false),
  selectedCount: 0,
};

describe('StravaImportDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnImport = vi.fn();
  const mockOnBulkImportSuccess = vi.fn();
  const mockQueryClient = new QueryClient();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStravaActivities.mockReturnValue({
      activities: mockActivities,
      loading: false,
      isConnected: true,
      connectToStrava: vi.fn(),
    });
    mockUseTableSelection.mockReturnValue(defaultMockSelection);
  });

  describe('Single activity import (create mode)', () => {
    it('should close Strava dialog and call onImport when importing single activity', async () => {
      const user = userEvent.setup();
      const mockClearSelection = vi.fn();

      mockUseTableSelection.mockReturnValueOnce({
        ...defaultMockSelection,
        selectedIndices: new Set([0]),
        clearSelection: mockClearSelection,
        isSelected: vi.fn((index: number) => index === 0) as unknown as typeof defaultMockSelection.isSelected,
        selectedCount: 1,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          date: '2024-01-15',
          duration: '01:00:00',
          distance: 10,
          avgPace: '06:00',
          avgHeartRate: 145,
          comments: 'Morning Run',
        }),
      });

      render(
        <StravaImportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onImport={mockOnImport}
          mode="create"
        />
      );

      const importButton = screen.getByRole('button', { name: /importer.*activité/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/strava/activity/1');
        expect(mockOnImport).toHaveBeenCalledWith({
          date: '2024-01-15',
          duration: '01:00:00',
          distance: 10,
          avgPace: '06:00',
          avgHeartRate: 145,
          comments: 'Morning Run',
        });
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        expect(mockClearSelection).toHaveBeenCalled();
      });
    });
  });

  describe('Bulk import (create mode, multiple activities)', () => {
    it('should bulk import with activity names as comments', async () => {
      const user = userEvent.setup();
      const mockClearSelection = vi.fn();

      const { bulkImportSessions } = await import('@/lib/services/api-client');
      vi.mocked(bulkImportSessions).mockResolvedValue({ count: 2, message: 'Success' });

      mockUseTableSelection.mockReturnValueOnce({
        ...defaultMockSelection,
        selectedIndices: new Set([0, 1]),
        clearSelection: mockClearSelection,
        isSelected: vi.fn((index: number) => index === 0 || index === 1) as unknown as typeof defaultMockSelection.isSelected,
        selectedCount: 2,
      });

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            date: '2024-01-15',
            duration: '01:00:00',
            distance: 10,
            avgPace: '06:00',
            avgHeartRate: 145,
            comments: 'Morning Run',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            date: '2024-01-16',
            duration: '00:40:00',
            distance: 8,
            avgPace: '05:00',
            avgHeartRate: 160,
            comments: 'Afternoon Tempo',
          }),
        });

      render(
        <StravaImportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onImport={mockOnImport}
          mode="create"
          queryClient={mockQueryClient}
          onBulkImportSuccess={mockOnBulkImportSuccess}
        />
      );

      const importButton = screen.getByRole('button', { name: /importer.*activité/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(bulkImportSessions).toHaveBeenCalledWith([
          {
            date: '2024-01-15',
            sessionType: '-',
            duration: '01:00:00',
            distance: 10,
            avgPace: '06:00',
            avgHeartRate: 145,
            perceivedExertion: null,
            comments: 'Morning Run',
          },
          {
            date: '2024-01-16',
            sessionType: '-',
            duration: '00:40:00',
            distance: 8,
            avgPace: '05:00',
            avgHeartRate: 160,
            perceivedExertion: null,
            comments: 'Afternoon Tempo',
          },
        ]);

        expect(mockHandleSuccess).toHaveBeenCalledWith(
          'Import réussi',
          '2 séance(s) Strava importée(s) avec succès'
        );
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        expect(mockClearSelection).toHaveBeenCalled();
        expect(mockOnBulkImportSuccess).toHaveBeenCalled();
      });
    });

    it('should handle empty comments gracefully in bulk import', async () => {
      const user = userEvent.setup();
      const mockClearSelection = vi.fn();

      const { bulkImportSessions } = await import('@/lib/services/api-client');
      vi.mocked(bulkImportSessions).mockResolvedValue({ count: 2, message: 'Success' });

      mockUseTableSelection.mockReturnValueOnce({
        ...defaultMockSelection,
        selectedIndices: new Set([0, 1]),
        clearSelection: mockClearSelection,
        isSelected: vi.fn((index: number) => index === 0 || index === 1) as unknown as typeof defaultMockSelection.isSelected,
        selectedCount: 2,
      });

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            date: '2024-01-15',
            duration: '01:00:00',
            distance: 10,
            avgPace: '06:00',
            avgHeartRate: 145,
            comments: '',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            date: '2024-01-16',
            duration: '00:40:00',
            distance: 8,
            avgPace: '05:00',
            avgHeartRate: 160,
            comments: 'Afternoon Tempo',
          }),
        });

      render(
        <StravaImportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onImport={mockOnImport}
          mode="create"
        />
      );

      const importButton = screen.getByRole('button', { name: /importer.*activité/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(bulkImportSessions).toHaveBeenCalledWith([
          {
            date: '2024-01-15',
            sessionType: '-',
            duration: '01:00:00',
            distance: 10,
            avgPace: '06:00',
            avgHeartRate: 145,
            perceivedExertion: null,
            comments: '',
          },
          {
            date: '2024-01-16',
            sessionType: '-',
            duration: '00:40:00',
            distance: 8,
            avgPace: '05:00',
            avgHeartRate: 160,
            perceivedExertion: null,
            comments: 'Afternoon Tempo',
          },
        ]);
      });
    });
  });

  describe('Complete mode', () => {
    it('should import activity to complete existing session', async () => {
      const user = userEvent.setup();
      const mockClearSelection = vi.fn();

      mockUseTableSelection.mockReturnValueOnce({
        ...defaultMockSelection,
        selectedIndices: new Set([0]),
        clearSelection: mockClearSelection,
        isSelected: vi.fn((index: number) => index === 0) as unknown as typeof defaultMockSelection.isSelected,
        selectedCount: 1,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          date: '2024-01-15',
          duration: '01:00:00',
          distance: 10,
          avgPace: '06:00',
          avgHeartRate: 145,
          comments: 'Morning Run',
        }),
      });

      render(
        <StravaImportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onImport={mockOnImport}
          mode="complete"
        />
      );

      const importButton = screen.getByRole('button', { name: /importer.*activité/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        expect(mockClearSelection).toHaveBeenCalled();
      });
    });
  });

  describe('Error handling', () => {
    it('should disable import button when no activities selected', () => {
      mockUseTableSelection.mockReturnValueOnce({
        ...defaultMockSelection,
        selectedIndices: new Set(),
        selectedCount: 0,
      });

      render(
        <StravaImportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onImport={mockOnImport}
          mode="create"
        />
      );

      const importButton = screen.getByRole('button', { name: /importer 0 activité/i });
      expect(importButton).toBeDisabled();
    });

    it('should handle fetch errors during bulk import', async () => {
      const user = userEvent.setup();

      mockUseTableSelection.mockReturnValueOnce({
        ...defaultMockSelection,
        selectedIndices: new Set([0, 1]),
        isSelected: vi.fn(() => true),
        selectedCount: 2,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      render(
        <StravaImportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onImport={mockOnImport}
          mode="create"
        />
      );

      const importButton = screen.getByRole('button', { name: /importer.*activité/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          null,
          "Aucune activité n'a pu être récupérée depuis Strava"
        );
      });
    });
  });

  describe('Connection state', () => {
    it('should show connect button when not connected', () => {
      mockUseStravaActivities.mockReturnValue({
        activities: [],
        loading: false,
        isConnected: false,
        connectToStrava: vi.fn(),
      });

      render(
        <StravaImportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onImport={mockOnImport}
          mode="create"
        />
      );

      expect(screen.getByText(/se connecter avec strava/i)).toBeInTheDocument();
    });

    it('should show activities table when connected', () => {
      render(
        <StravaImportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onImport={mockOnImport}
          mode="create"
        />
      );

      expect(screen.getByText('Morning Run')).toBeInTheDocument();
      expect(screen.getByText('Afternoon Tempo')).toBeInTheDocument();
    });
  });
});
