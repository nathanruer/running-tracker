import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SortIcon } from '../sort-icon';

describe('SortIcon', () => {
  it('should render default sort icon when column is not sorted', () => {
    const { container } = render(
      <SortIcon column="duration" sortColumn={null} sortDirection={null} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.toString()).toContain('lucide-arrow-up-down');
  });

  it('should render default icon when sorted by different column', () => {
    const { container } = render(
      <SortIcon column="duration" sortColumn="distance" sortDirection="desc" />
    );

    const svg = container.querySelector('svg');
    expect(svg?.classList.toString()).toContain('lucide-arrow-up-down');
  });

  it('should render down chevron when sorted descending', () => {
    const { container } = render(
      <SortIcon column="duration" sortColumn="duration" sortDirection="desc" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.toString()).toContain('lucide-chevron-down');
    expect(svg).toHaveClass('text-foreground');
  });

  it('should render up chevron when sorted ascending', () => {
    const { container } = render(
      <SortIcon column="duration" sortColumn="duration" sortDirection="asc" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.toString()).toContain('lucide-chevron-up');
    expect(svg).toHaveClass('text-foreground');
  });

  it('should apply correct classes to all icons', () => {
    const { container, rerender } = render(
      <SortIcon column="distance" sortColumn={null} sortDirection={null} />
    );

    let svg = container.querySelector('svg');
    expect(svg).toHaveClass('mr-2', 'h-4', 'w-4');

    rerender(<SortIcon column="distance" sortColumn="distance" sortDirection="desc" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveClass('mr-2', 'h-4', 'w-4');

    rerender(<SortIcon column="distance" sortColumn="distance" sortDirection="asc" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveClass('mr-2', 'h-4', 'w-4');
  });

  it('should handle null sort direction', () => {
    const { container } = render(
      <SortIcon column="avgPace" sortColumn="avgPace" sortDirection={null} />
    );

    const svg = container.querySelector('svg');
    expect(svg?.classList.toString()).toContain('lucide-arrow-up-down');
  });
});
