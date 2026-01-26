import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StravaLoadingSkeleton, StravaLoadingMoreSkeleton } from '../strava-loading-skeleton';

describe('StravaLoadingSkeleton', () => {
  it('renders with default 6 rows', () => {
    const { container } = render(<StravaLoadingSkeleton />);
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(6);
  });

  it('renders with custom number of rows', () => {
    const { container } = render(<StravaLoadingSkeleton rows={3} />);
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(3);
  });

  it('renders with 10 rows', () => {
    const { container } = render(<StravaLoadingSkeleton rows={10} />);
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(10);
  });

  it('renders animated skeleton elements', () => {
    const { container } = render(<StravaLoadingSkeleton />);
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});

describe('StravaLoadingMoreSkeleton', () => {
  it('renders 3 skeleton rows', () => {
    const { container } = render(<StravaLoadingMoreSkeleton />);
    const skeletonRows = container.querySelectorAll('.flex.items-center.gap-4.opacity-40');
    expect(skeletonRows).toHaveLength(3);
  });

  it('renders animated skeleton elements', () => {
    const { container } = render(<StravaLoadingMoreSkeleton />);
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});
