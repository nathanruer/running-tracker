import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ImportLoadingSkeleton } from '../loading-skeleton';

describe('ImportLoadingSkeleton', () => {
  it('renders with default 6 rows', () => {
    const { container } = render(<ImportLoadingSkeleton />);
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(6);
  });

  it('renders with custom number of rows', () => {
    const { container } = render(<ImportLoadingSkeleton rows={3} />);
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(3);
  });

  it('renders with 10 rows', () => {
    const { container } = render(<ImportLoadingSkeleton rows={10} />);
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(10);
  });

  it('renders animated skeleton elements', () => {
    const { container } = render(<ImportLoadingSkeleton />);
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});
