import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfileSkeleton, AnalyticsSkeleton, HistorySkeleton } from '../profile-skeleton';

describe('ProfileSkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render tab navigation placeholders', () => {
    const { container } = render(<ProfileSkeleton />);
    const tabs = container.querySelectorAll('.h-9.w-24, .h-9.w-24.sm\\:w-32');
    expect(tabs.length).toBe(3);
  });

  it('should render multiple Cards', () => {
    const { container } = render(<ProfileSkeleton />);
    const cards = container.querySelectorAll('.rounded-xl.border');
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('should have animated elements', () => {
    const { container } = render(<ProfileSkeleton />);
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('should render table rows in training zones card', () => {
    const { container } = render(<ProfileSkeleton />);
    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows.length).toBe(6);
  });
});

describe('AnalyticsSkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<AnalyticsSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render stat cards placeholders', () => {
    const { container } = render(<AnalyticsSkeleton />);
    const statCards = container.querySelectorAll('.md\\:grid-cols-3 > div');
    expect(statCards.length).toBe(3);
  });

  it('should render title placeholder', () => {
    const { container } = render(<AnalyticsSkeleton />);
    const title = container.querySelector('.h-12.w-80');
    expect(title).toBeInTheDocument();
  });
});

describe('HistorySkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<HistorySkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render calendar placeholder', () => {
    const { container } = render(<HistorySkeleton />);
    const placeholder = container.querySelector('.h-\\[250px\\].md\\:h-\\[280px\\]');
    expect(placeholder).toBeInTheDocument();
  });
});
