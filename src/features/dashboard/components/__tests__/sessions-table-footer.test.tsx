import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SessionsTableFooter } from '../sessions-table-footer';

describe('SessionsTableFooter', () => {
  it('renders loading skeleton when fetching next page', () => {
    const { container } = render(
      <SessionsTableFooter hasMore={true} sessionsCount={5} isFetchingNextPage={true} />
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders scroll hint when has more and not fetching', () => {
    render(
      <SessionsTableFooter hasMore={true} sessionsCount={5} isFetchingNextPage={false} />
    );
    expect(screen.getByText('DÉFILEZ POUR PLUS')).toBeInTheDocument();
  });

  it('renders end of history when no more and enough sessions', () => {
    render(
      <SessionsTableFooter hasMore={false} sessionsCount={12} isFetchingNextPage={false} />
    );
    expect(screen.getByText("Fin de l'historique")).toBeInTheDocument();
  });

  it('renders nothing when no more and few sessions', () => {
    const { container } = render(
      <SessionsTableFooter hasMore={false} sessionsCount={5} isFetchingNextPage={false} />
    );
    expect(container.textContent).toBe('');
  });
});
