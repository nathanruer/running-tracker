import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DateRangeSelector } from '../date-range-selector';

describe('DateRangeSelector', () => {
  const mockOnDateRangeChange = vi.fn();

  it('should render the select trigger', () => {
    render(
      <DateRangeSelector 
        dateRange="all" 
        onDateRangeChange={mockOnDateRangeChange}
        customStartDate=""
        onCustomStartDateChange={vi.fn()}
        customEndDate=""
        onCustomEndDateChange={vi.fn()}
        customDateError={undefined}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should show date pickers when custom range is selected', () => {
    render(
      <DateRangeSelector 
        dateRange="custom" 
        onDateRangeChange={mockOnDateRangeChange}
        customStartDate=""
        onCustomStartDateChange={vi.fn()}
        customEndDate=""
        onCustomEndDateChange={vi.fn()}
        customDateError={undefined}
      />
    );

    expect(screen.getByText('Début')).toBeInTheDocument();
    expect(screen.getByText('Fin')).toBeInTheDocument();
  });

  it('should display error message when provided', () => {
    render(
      <DateRangeSelector 
        dateRange="custom" 
        onDateRangeChange={mockOnDateRangeChange}
        customStartDate=""
        onCustomStartDateChange={vi.fn()}
        customEndDate=""
        onCustomEndDateChange={vi.fn()}
        customDateError="Invalid range"
      />
    );

    expect(screen.getByText(/invalid range/i)).toBeInTheDocument();
  });
});
