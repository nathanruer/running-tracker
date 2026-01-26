import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StravaLoadingSkeleton, StravaLoadingMoreSkeleton } from '../strava-loading-skeleton';

describe('StravaLoadingSkeleton', () => {
  it('renders with default 6 rows', () => {
    render(<StravaLoadingSkeleton />);
    const skeletonRows = screen.getAllByRole('generic').filter(
      el => el.className.includes('opacity-40') && el.className.includes('flex items-center gap-4')
    );
    expect(skeletonRows).toHaveLength(6);
  });

  it('renders with custom number of rows', () => {
    render(<StravaLoadingSkeleton rows={3} />);
    const skeletonRows = screen.getAllByRole('generic').filter(
      el => el.className.includes('opacity-40') && el.className.includes('flex items-center gap-4')
    );
    expect(skeletonRows).toHaveLength(3);
  });

  it('renders with 10 rows', () => {
    render(<StravaLoadingSkeleton rows={10} />);
    const skeletonRows = screen.getAllByRole('generic').filter(
      el => el.className.includes('opacity-40') && el.className.includes('flex items-center gap-4')
    );
    expect(skeletonRows).toHaveLength(10);
  });

  it('renders animated skeleton elements', () => {
    const { container } = render(<StravaLoadingSkeleton />);
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});

describe('StravaLoadingMoreSkeleton', () => {
  it('renders 3 skeleton rows', () => {
    render(<StravaLoadingMoreSkeleton />);
    const skeletonRows = screen.getAllByRole('generic').filter(
      el => el.className.includes('opacity-40') && el.className.includes('flex items-center gap-4')
    );
    expect(skeletonRows).toHaveLength(3);
  });

  it('renders animated skeleton elements', () => {
    const { container } = render(<StravaLoadingMoreSkeleton />);
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});
