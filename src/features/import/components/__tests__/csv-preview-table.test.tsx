import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsvPreviewTable, ParsedSession } from '../csv-preview-table';

const mockSessions: ParsedSession[] = [
  {
    date: '2024-01-01',
    sessionType: 'Endurance fondamentale',
    duration: '00:45:00',
    distance: 8.5,
    avgPace: '05:18',
    avgHeartRate: 145,
    perceivedExertion: 5,
    comments: 'Bonne séance',
    intervalDetails: null,
  },
  {
    date: '2024-01-03',
    sessionType: 'Fractionné',
    duration: '00:30:00',
    distance: 5.2,
    avgPace: '05:00',
    avgHeartRate: 165,
    perceivedExertion: 8,
    comments: 'Difficile',
    intervalDetails: '8x1\'/1\'',
  },
  {
    date: '2024-01-05',
    sessionType: 'Récupération',
    duration: '00:20:00',
    distance: 3.0,
    avgPace: '06:40',
    avgHeartRate: 120,
    perceivedExertion: 2,
    comments: '',
    intervalDetails: null,
  },
];

describe('CsvPreviewTable', () => {
  let mockOnToggleSelect: (index: number) => void;
  let mockOnToggleSelectAll: () => void;
  let mockOnSort: (column: string) => void;

  beforeEach(() => {
    mockOnToggleSelect = vi.fn();
    mockOnToggleSelectAll = vi.fn();
    mockOnSort = vi.fn();
  });

  const renderTable = (overrides = {}) => {
    return render(
      <CsvPreviewTable
        preview={mockSessions}
        selectedIndices={new Set()}
        sortColumn={null}
        sortDirection={null}
        onToggleSelect={mockOnToggleSelect}
        onToggleSelectAll={mockOnToggleSelectAll}
        onSort={mockOnSort}
        {...overrides}
      />
    );
  };

  describe('Data rendering', () => {
    it('should display all session data correctly', () => {
      renderTable();

      // Session types
      expect(screen.getByText('Endurance fondamentale')).toBeInTheDocument();
      expect(screen.getByText('Fractionné')).toBeInTheDocument();
      expect(screen.getByText('Récupération')).toBeInTheDocument();

      // Formatted dates
      expect(screen.getByText('01/01/2024')).toBeInTheDocument();
      expect(screen.getByText('03/01/2024')).toBeInTheDocument();
      expect(screen.getByText('05/01/2024')).toBeInTheDocument();

      // Duration and distance
      expect(screen.getByText('00:45:00')).toBeInTheDocument();
      expect(screen.getByText('8.50 km')).toBeInTheDocument();
      expect(screen.getByText('5.20 km')).toBeInTheDocument();

      // Comments
      expect(screen.getByText('Bonne séance')).toBeInTheDocument();
      expect(screen.getByText('Difficile')).toBeInTheDocument();
    });

    it('should color code RPE values correctly', () => {
      renderTable();

      const lowRPE = screen.getByText('2/10');
      const mediumRPE = screen.getByText('5/10');
      const highRPE = screen.getByText('8/10');

      expect(lowRPE).toHaveClass('text-green-500');
      expect(mediumRPE).toHaveClass('text-yellow-500');
      expect(highRPE).toHaveClass('text-orange-500');
    });

    it('should show "-" when RPE is not provided', () => {
      const sessionWithoutRPE: ParsedSession[] = [
        {
          date: '2024-01-01',
          sessionType: 'Test',
          duration: '00:30:00',
          distance: 5.0,
          avgPace: '06:00',
          avgHeartRate: 140,
          comments: '',
          intervalDetails: null,
        },
      ];

      render(
        <CsvPreviewTable
          preview={sessionWithoutRPE}
          selectedIndices={new Set()}
          sortColumn={null}
          sortDirection={null}
          onToggleSelect={mockOnToggleSelect}
          onToggleSelectAll={mockOnToggleSelectAll}
          onSort={mockOnSort}
        />
      );

      const rows = screen.getAllByRole('row');
      const cells = within(rows[1]).getAllByRole('cell');
      expect(within(cells[7]).getByText('-')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onToggleSelect when row is clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const rows = screen.getAllByRole('row');
      await user.click(rows[1]);

      expect(mockOnToggleSelect).toHaveBeenCalledWith(0);
    });

    it('should call onToggleSelect when checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      expect(mockOnToggleSelect).toHaveBeenCalledWith(0);
    });

    it('should call onToggleSelectAll when header checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(mockOnToggleSelectAll).toHaveBeenCalled();
    });

    it('should check individual checkboxes when sessions are selected', () => {
      renderTable({ selectedIndices: new Set([0, 2]) });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();
      expect(checkboxes[3]).toBeChecked();
    });
  });

  describe('Sorting', () => {
    it('should call onSort when sortable column headers are clicked', async () => {
      const user = userEvent.setup();
      renderTable();

      const durationHeader = screen.getByRole('button', { name: /durée/i });
      await user.click(durationHeader);
      expect(mockOnSort).toHaveBeenCalledWith('duration');

      const distanceHeader = screen.getByRole('button', { name: /distance/i });
      await user.click(distanceHeader);
      expect(mockOnSort).toHaveBeenCalledWith('distance');

      const paceHeader = screen.getByRole('button', { name: /allure/i });
      await user.click(paceHeader);
      expect(mockOnSort).toHaveBeenCalledWith('avgPace');
    });

    it('should show correct sort icon for sorted column', () => {
      const { container: descContainer } = renderTable({
        sortColumn: 'duration',
        sortDirection: 'desc',
      });
      expect(descContainer.querySelector('.lucide-chevron-down')).toBeInTheDocument();

      const { container: ascContainer } = renderTable({
        sortColumn: 'distance',
        sortDirection: 'asc',
      });
      expect(ascContainer.querySelector('.lucide-chevron-up')).toBeInTheDocument();
    });
  });
});
