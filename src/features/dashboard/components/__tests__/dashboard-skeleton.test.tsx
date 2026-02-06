import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardSkeleton } from '../dashboard-skeleton';

describe('DashboardSkeleton', () => {
  it('should render skeleton container', () => {
    render(<DashboardSkeleton />);
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  it('should render table with its structure', () => {
    const { container } = render(<DashboardSkeleton />);
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
  });

  it('should render table header row', () => {
    const { container } = render(<DashboardSkeleton />);
    const headerRow = container.querySelector('thead tr');
    expect(headerRow).toBeInTheDocument();
  });

  it('should render 8 skeleton rows', () => {
    const { container } = render(<DashboardSkeleton />);
    const bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(8);
  });

  it('should have animated elements', () => {
    const { container } = render(<DashboardSkeleton />);
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('should render table header cells', () => {
    const { container } = render(<DashboardSkeleton />);
    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells.length).toBeGreaterThan(0);
  });
});
