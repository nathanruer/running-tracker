import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateRangeSelector } from '../date-range-selector';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange?: (value: string) => void; value?: string }) => (
    <div data-testid="mock-select" data-value={value}>
      <button type="button" onClick={() => onValueChange?.('custom')}>change</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  SelectValue: () => <span>value</span>,
}));

vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ onSelect, placeholder }: { onSelect: (date?: Date) => void; placeholder: string }) => (
    <button type="button" onClick={() => onSelect(new Date('2024-01-15T00:00:00'))}>{placeholder}</button>
  ),
}));

describe('DateRangeSelector', () => {
  const mockOnDateRangeChange = vi.fn();
  const mockOnCustomStartDateChange = vi.fn();
  const mockOnCustomEndDateChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the select trigger', () => {
    render(
      <DateRangeSelector 
        dateRange="all" 
        onDateRangeChange={mockOnDateRangeChange}
customStartDate=""
        onCustomStartDateChange={mockOnCustomStartDateChange}
        customEndDate=""
        onCustomEndDateChange={mockOnCustomEndDateChange}
        customDateError={undefined}
        rangeLabel="26 jan → 8 fév 2026"
      />
    );

    expect(screen.getByTestId('mock-select')).toBeInTheDocument();
    expect(screen.getByTestId('range-label')).toHaveTextContent('26 jan → 8 fév 2026');
  });

  it('should show date pickers when custom range is selected', () => {
    render(
      <DateRangeSelector 
        dateRange="custom" 
        onDateRangeChange={mockOnDateRangeChange}
customStartDate=""
        onCustomStartDateChange={mockOnCustomStartDateChange}
        customEndDate=""
        onCustomEndDateChange={mockOnCustomEndDateChange}
        customDateError={undefined}
        rangeLabel="26 jan → 8 fév 2026"
      />
    );

    expect(screen.getByText('Début')).toBeInTheDocument();
    expect(screen.getByText('Fin')).toBeInTheDocument();
  });

  it('should call onDateRangeChange when selecting custom', () => {
    render(
      <DateRangeSelector 
        dateRange="all" 
        onDateRangeChange={mockOnDateRangeChange}
customStartDate=""
        onCustomStartDateChange={mockOnCustomStartDateChange}
        customEndDate=""
        onCustomEndDateChange={mockOnCustomEndDateChange}
        customDateError={undefined}
        rangeLabel="26 jan → 8 fév 2026"
      />
    );

    const rangeSelect = screen.getByTestId('mock-select');
    fireEvent.click(rangeSelect.querySelector('button') as HTMLButtonElement);

    expect(mockOnDateRangeChange).toHaveBeenCalledWith('custom');
  });

  it('should format custom dates on selection', () => {
    render(
      <DateRangeSelector 
        dateRange="custom" 
        onDateRangeChange={mockOnDateRangeChange}
customStartDate=""
        onCustomStartDateChange={mockOnCustomStartDateChange}
        customEndDate=""
        onCustomEndDateChange={mockOnCustomEndDateChange}
        customDateError={undefined}
        rangeLabel="26 jan → 8 fév 2026"
      />
    );

    fireEvent.click(screen.getByText('Début'));
    fireEvent.click(screen.getByText('Fin'));

    expect(mockOnCustomStartDateChange).toHaveBeenCalledWith('2024-01-15');
    expect(mockOnCustomEndDateChange).toHaveBeenCalledWith('2024-01-15');
  });

  it('should display error message when provided', () => {
    render(
      <DateRangeSelector 
        dateRange="custom" 
        onDateRangeChange={mockOnDateRangeChange}
customStartDate=""
        onCustomStartDateChange={mockOnCustomStartDateChange}
        customEndDate=""
        onCustomEndDateChange={mockOnCustomEndDateChange}
        customDateError="Invalid range"
        rangeLabel="26 jan → 8 fév 2026"
      />
    );

    expect(screen.getByText(/invalid range/i)).toBeInTheDocument();
  });
});
