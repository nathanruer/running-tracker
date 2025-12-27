import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DateRangeInputs } from '../date-range-inputs';

describe('DateRangeInputs', () => {
  it('should render start and end date labels', () => {
    const mockOnStartChange = vi.fn();
    const mockOnEndChange = vi.fn();

    render(
      <DateRangeInputs
        startDate={undefined}
        endDate={undefined}
        onStartChange={mockOnStartChange}
        onEndChange={mockOnEndChange}
      />
    );

    expect(screen.getByText('Date de début')).toBeInTheDocument();
    expect(screen.getByText('Date de fin')).toBeInTheDocument();
  });

  it('should render two date pickers', () => {
    const mockOnStartChange = vi.fn();
    const mockOnEndChange = vi.fn();

    render(
      <DateRangeInputs
        startDate={undefined}
        endDate={undefined}
        onStartChange={mockOnStartChange}
        onEndChange={mockOnEndChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should display start date when provided', () => {
    const mockOnStartChange = vi.fn();
    const mockOnEndChange = vi.fn();
    const startDate = new Date('2024-01-01');

    render(
      <DateRangeInputs
        startDate={startDate}
        endDate={undefined}
        onStartChange={mockOnStartChange}
        onEndChange={mockOnEndChange}
      />
    );

    expect(screen.getByText('1 janvier 2024')).toBeInTheDocument();
  });

  it('should display end date when provided', () => {
    const mockOnStartChange = vi.fn();
    const mockOnEndChange = vi.fn();
    const endDate = new Date('2024-12-31');

    render(
      <DateRangeInputs
        startDate={undefined}
        endDate={endDate}
        onStartChange={mockOnStartChange}
        onEndChange={mockOnEndChange}
      />
    );

    expect(screen.getByText('31 décembre 2024')).toBeInTheDocument();
  });

  it('should display both dates when provided', () => {
    const mockOnStartChange = vi.fn();
    const mockOnEndChange = vi.fn();
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    render(
      <DateRangeInputs
        startDate={startDate}
        endDate={endDate}
        onStartChange={mockOnStartChange}
        onEndChange={mockOnEndChange}
      />
    );

    expect(screen.getByText('1 janvier 2024')).toBeInTheDocument();
    expect(screen.getByText('31 décembre 2024')).toBeInTheDocument();
  });

  it('should show placeholder when dates are undefined', () => {
    const mockOnStartChange = vi.fn();
    const mockOnEndChange = vi.fn();

    render(
      <DateRangeInputs
        startDate={undefined}
        endDate={undefined}
        onStartChange={mockOnStartChange}
        onEndChange={mockOnEndChange}
      />
    );

    const placeholders = screen.getAllByText(/choisir une date/i);
    expect(placeholders).toHaveLength(2);
  });
});
