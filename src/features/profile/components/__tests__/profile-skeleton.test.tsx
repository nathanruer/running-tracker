import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfileSkeleton, AnalyticsSkeleton, HistorySkeleton } from '../profile-skeleton';

describe('ProfileSkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<ProfileSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render mobile title placeholder', () => {
    const { container } = render(<ProfileSkeleton />);

    const mobileTitle = container.querySelector('.md\\:hidden.h-9.w-48');
    expect(mobileTitle).toBeInTheDocument();
  });

  it('should render tab navigation placeholders', () => {
    const { container } = render(<ProfileSkeleton />);

    const tabs = container.querySelectorAll('.h-9.w-24, .h-9.w-24.sm\\:w-32');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('should render two cards in grid', () => {
    const { container } = render(<ProfileSkeleton />);

    const cards = container.querySelectorAll('.border-border\\/50.bg-card\\/50');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should have animated elements', () => {
    const { container } = render(<ProfileSkeleton />);

    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('should render form field placeholders', () => {
    const { container } = render(<ProfileSkeleton />);

    const inputs = container.querySelectorAll('.h-10.w-full.bg-muted\\/30');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should render table rows in training zones card', () => {
    const { container } = render(<ProfileSkeleton />);

    const tableRows = container.querySelectorAll('.h-\\[53px\\]');
    expect(tableRows.length).toBe(6);
  });
});

describe('AnalyticsSkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<AnalyticsSkeleton />);

    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('should render stat cards placeholders', () => {
    const { container } = render(<AnalyticsSkeleton />);

    const statCards = container.querySelectorAll('.h-32.bg-muted\\/40');
    expect(statCards.length).toBe(3);
  });

  it('should render chart placeholder', () => {
    const { container } = render(<AnalyticsSkeleton />);

    const chart = container.querySelector('.h-80.bg-muted\\/40');
    expect(chart).toBeInTheDocument();
  });

  it('should render title placeholder', () => {
    const { container } = render(<AnalyticsSkeleton />);

    const title = container.querySelector('.h-12.w-64');
    expect(title).toBeInTheDocument();
  });
});

describe('HistorySkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<HistorySkeleton />);

    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('should render calendar placeholder', () => {
    const { container } = render(<HistorySkeleton />);

    const calendar = container.querySelector('.h-96.bg-muted\\/40');
    expect(calendar).toBeInTheDocument();
  });
});
