import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StravaTableHeader } from '../strava-table-header';

vi.mock('@/components/ui/table', () => ({
  TableHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <thead className={className} data-testid="table-header">{children}</thead>
  ),
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, className }: { checked: boolean; onCheckedChange: () => void; className?: string }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={onCheckedChange}
      className={className}
      data-testid="select-all-checkbox"
    />
  ),
}));

const MockSortIcon = ({ column }: { column: string }) => (
  <span data-testid={`sort-icon-${column}`}>^</span>
);

describe('StravaTableHeader', () => {
  const mockOnToggleSelectAll = vi.fn();
  const mockOnSort = vi.fn();

  const defaultProps = {
    mode: 'create' as const,
    hasActivities: true,
    isAllSelected: false,
    onToggleSelectAll: mockOnToggleSelectAll,
    sortColumn: null,
    onSort: mockOnSort,
    SortIcon: MockSortIcon,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table header', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    expect(screen.getByTestId('table-header')).toBeInTheDocument();
  });

  it('renders checkbox in create mode', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} mode="create" />
      </table>
    );
    expect(screen.getByTestId('select-all-checkbox')).toBeInTheDocument();
  });

  it('renders checkbox in edit mode', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} mode="edit" />
      </table>
    );
    expect(screen.getByTestId('select-all-checkbox')).toBeInTheDocument();
  });

  it('does not render checkbox in complete mode', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} mode="complete" />
      </table>
    );
    expect(screen.queryByTestId('select-all-checkbox')).not.toBeInTheDocument();
  });

  it('calls onToggleSelectAll when checkbox is clicked', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    fireEvent.click(screen.getByTestId('select-all-checkbox'));
    expect(mockOnToggleSelectAll).toHaveBeenCalled();
  });

  it('renders all sortable column headers', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Durée')).toBeInTheDocument();
    expect(screen.getByText('Dist.')).toBeInTheDocument();
    expect(screen.getByText('Allure')).toBeInTheDocument();
    expect(screen.getByText('FC')).toBeInTheDocument();
    expect(screen.getByText('Activité')).toBeInTheDocument();
  });

  it('calls onSort with column name when clicking date header', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    fireEvent.click(screen.getByText('Date'));
    expect(mockOnSort).toHaveBeenCalledWith('date');
  });

  it('calls onSort with column name when clicking distance header', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    fireEvent.click(screen.getByText('Dist.'));
    expect(mockOnSort).toHaveBeenCalledWith('distance');
  });

  it('calls onSort with column name when clicking duration header', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    fireEvent.click(screen.getByText('Durée'));
    expect(mockOnSort).toHaveBeenCalledWith('duration');
  });

  it('calls onSort with column name when clicking pace header', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    fireEvent.click(screen.getByText('Allure'));
    expect(mockOnSort).toHaveBeenCalledWith('pace');
  });

  it('calls onSort with column name when clicking heart rate header', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    fireEvent.click(screen.getByText('FC'));
    expect(mockOnSort).toHaveBeenCalledWith('heartRate');
  });

  it('renders sort icons for each sortable column', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} />
      </table>
    );
    expect(screen.getByTestId('sort-icon-date')).toBeInTheDocument();
    expect(screen.getByTestId('sort-icon-duration')).toBeInTheDocument();
    expect(screen.getByTestId('sort-icon-distance')).toBeInTheDocument();
    expect(screen.getByTestId('sort-icon-pace')).toBeInTheDocument();
    expect(screen.getByTestId('sort-icon-heartRate')).toBeInTheDocument();
  });

  it('shows checkbox as checked when isAllSelected is true', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} isAllSelected={true} />
      </table>
    );
    expect(screen.getByTestId('select-all-checkbox')).toBeChecked();
  });

  it('shows checkbox as unchecked when hasActivities is false', () => {
    render(
      <table>
        <StravaTableHeader {...defaultProps} hasActivities={false} isAllSelected={true} />
      </table>
    );
    expect(screen.getByTestId('select-all-checkbox')).not.toBeChecked();
  });
});
