import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardSkeleton } from '../dashboard-skeleton';

describe('DashboardSkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<DashboardSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render table with testid', () => {
    render(<DashboardSkeleton />);

    expect(screen.getByTestId('sessions-table')).toBeInTheDocument();
  });

  it('should render table header row', () => {
    render(<DashboardSkeleton />);

    const table = screen.getByTestId('sessions-table');
    const headerRow = table.querySelector('thead tr');
    expect(headerRow).toBeInTheDocument();
  });

  it('should render 8 skeleton rows', () => {
    render(<DashboardSkeleton />);

    const table = screen.getByTestId('sessions-table');
    const bodyRows = table.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(8);
  });

  it('should render mobile title placeholder', () => {
    const { container } = render(<DashboardSkeleton />);

    const mobileTitle = container.querySelector('.md\\:hidden.h-10.w-48');
    expect(mobileTitle).toBeInTheDocument();
  });

  it('should render header controls skeleton', () => {
    const { container } = render(<DashboardSkeleton />);

    const addButton = container.querySelector('.h-11.w-40');
    expect(addButton).toBeInTheDocument();
  });

  it('should render filter placeholders', () => {
    const { container } = render(<DashboardSkeleton />);

    const filters = container.querySelectorAll('.h-10.w-full.sm\\:w-\\[200px\\], .h-10.w-full.sm\\:w-\\[180px\\]');
    expect(filters.length).toBeGreaterThanOrEqual(1);
  });

  it('should have animated elements', () => {
    const { container } = render(<DashboardSkeleton />);

    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('should render table header cells', () => {
    render(<DashboardSkeleton />);

    const table = screen.getByTestId('sessions-table');
    const headerCells = table.querySelectorAll('thead th');
    expect(headerCells.length).toBeGreaterThan(0);
  });
});
