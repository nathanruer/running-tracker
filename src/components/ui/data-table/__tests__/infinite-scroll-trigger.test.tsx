import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { InfiniteScrollTrigger } from '../infinite-scroll-trigger';

describe('InfiniteScrollTrigger', () => {
  const observerRef = createRef<HTMLDivElement>();

  it('renders scroll message when hasMore and not loading', () => {
    render(
      <InfiniteScrollTrigger
        hasMore={true}
        loading={false}
        observerRef={observerRef}
      />
    );
    expect(screen.getByText('Défilez pour charger plus')).toBeInTheDocument();
  });

  it('renders default skeleton when hasMore and loading', () => {
    render(
      <InfiniteScrollTrigger
        hasMore={true}
        loading={true}
        observerRef={observerRef}
      />
    );
    expect(screen.queryByText('Défilez pour charger plus')).not.toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders custom skeleton when provided', () => {
    render(
      <InfiniteScrollTrigger
        hasMore={true}
        loading={true}
        observerRef={observerRef}
        skeleton={<div data-testid="custom-skeleton">Loading...</div>}
      />
    );
    expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
  });

  it('renders nothing when hasMore is false', () => {
    const { container } = render(
      <InfiniteScrollTrigger
        hasMore={false}
        loading={false}
        observerRef={observerRef}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
