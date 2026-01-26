import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PeriodFilter } from '../period-filter';
import type { Period } from '../../hooks/use-period-filter';

describe('PeriodFilter', () => {
  const mockOnPeriodChange = vi.fn();

  const defaultProps = {
    period: 'all' as Period,
    onPeriodChange: mockOnPeriodChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all period options', () => {
    render(<PeriodFilter {...defaultProps} />);

    expect(screen.getByText('Tout')).toBeInTheDocument();
    expect(screen.getByText('Semaine')).toBeInTheDocument();
    expect(screen.getByText('Mois')).toBeInTheDocument();
    expect(screen.getByText('Année')).toBeInTheDocument();
  });

  it('highlights the active period button', () => {
    render(<PeriodFilter {...defaultProps} period="week" />);

    const weekButton = screen.getByText('Semaine');
    expect(weekButton).toHaveClass('bg-violet-600');
    expect(weekButton).toHaveClass('text-white');
  });

  it('does not highlight inactive period buttons', () => {
    render(<PeriodFilter {...defaultProps} period="week" />);

    const allButton = screen.getByText('Tout');
    expect(allButton).not.toHaveClass('bg-violet-600');
    expect(allButton).toHaveClass('text-muted-foreground/60');
  });

  it('calls onPeriodChange when a period button is clicked', () => {
    render(<PeriodFilter {...defaultProps} />);

    fireEvent.click(screen.getByText('Mois'));

    expect(mockOnPeriodChange).toHaveBeenCalledWith('month');
  });

  it('calls onPeriodChange with "all" when Tout is clicked', () => {
    render(<PeriodFilter {...defaultProps} period="month" />);

    fireEvent.click(screen.getByText('Tout'));

    expect(mockOnPeriodChange).toHaveBeenCalledWith('all');
  });

  it('calls onPeriodChange with "year" when Année is clicked', () => {
    render(<PeriodFilter {...defaultProps} />);

    fireEvent.click(screen.getByText('Année'));

    expect(mockOnPeriodChange).toHaveBeenCalledWith('year');
  });

  it('renders correct number of buttons', () => {
    render(<PeriodFilter {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
  });

  it('applies correct styling classes to container', () => {
    const { container } = render(<PeriodFilter {...defaultProps} />);

    const filterContainer = container.firstChild;
    expect(filterContainer).toHaveClass('flex');
    expect(filterContainer).toHaveClass('items-center');
    expect(filterContainer).toHaveClass('rounded-xl');
  });
});
