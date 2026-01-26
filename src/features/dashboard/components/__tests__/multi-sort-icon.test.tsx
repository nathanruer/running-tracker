import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MultiSortIcon } from '../multi-sort-icon';
import type { SortConfig } from '@/lib/domain/sessions';

describe('MultiSortIcon', () => {
  it('should render ArrowUpDown icon when column is not sorted', () => {
    const sortConfig: SortConfig = [];

    const { container } = render(
      <MultiSortIcon column="date" sortConfig={sortConfig} />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('opacity-50');
  });

  it('should render ChevronDown for descending sort', () => {
    const sortConfig: SortConfig = [{ column: 'date', direction: 'desc' }];

    const { container } = render(
      <MultiSortIcon column="date" sortConfig={sortConfig} />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-foreground');
  });

  it('should render ChevronUp for ascending sort', () => {
    const sortConfig: SortConfig = [{ column: 'date', direction: 'asc' }];

    const { container } = render(
      <MultiSortIcon column="date" sortConfig={sortConfig} />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-foreground');
  });

  it('should not show position badge for single sort', () => {
    const sortConfig: SortConfig = [{ column: 'date', direction: 'desc' }];

    render(<MultiSortIcon column="date" sortConfig={sortConfig} />);

    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('should show position badge for multi-sort', () => {
    const sortConfig: SortConfig = [
      { column: 'date', direction: 'desc' },
      { column: 'sessionType', direction: 'asc' },
    ];

    render(<MultiSortIcon column="date" sortConfig={sortConfig} />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show correct position for second column in multi-sort', () => {
    const sortConfig: SortConfig = [
      { column: 'date', direction: 'desc' },
      { column: 'sessionType', direction: 'asc' },
    ];

    render(<MultiSortIcon column="sessionType" sortConfig={sortConfig} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show default icon for unsorted column in multi-sort', () => {
    const sortConfig: SortConfig = [
      { column: 'date', direction: 'desc' },
    ];

    const { container } = render(
      <MultiSortIcon column="sessionType" sortConfig={sortConfig} />
    );

    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('opacity-50');
  });
});
