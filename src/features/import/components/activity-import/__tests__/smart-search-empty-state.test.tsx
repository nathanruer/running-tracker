import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SmartSearchEmptyState } from '../smart-search-empty-state';

describe('SmartSearchEmptyState', () => {
  const mockOnSearchAll = vi.fn();

  const defaultProps = {
    searchQuery: 'marathon',
    hasMore: true,
    searchLoading: false,
    loadedCount: 20,
    totalCount: 100,
    onSearchAll: mockOnSearchAll,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state when searchLoading', () => {
    render(<SmartSearchEmptyState {...defaultProps} searchLoading={true} />);
    expect(screen.getByText(/Recherche de "marathon".../)).toBeInTheDocument();
    expect(screen.getByText('20 / 100 activités analysées')).toBeInTheDocument();
  });

  it('displays spinner when searchLoading', () => {
    render(<SmartSearchEmptyState {...defaultProps} searchLoading={true} />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays final state when no hasMore', () => {
    render(<SmartSearchEmptyState {...defaultProps} hasMore={false} />);
    expect(screen.getByText(/Aucune activité trouvée pour "marathon"/)).toBeInTheDocument();
    expect(screen.getByText('Toutes les 20 activités ont été analysées')).toBeInTheDocument();
  });

  it('displays call to action when hasMore and not loading', () => {
    render(<SmartSearchEmptyState {...defaultProps} />);
    expect(screen.getByText('Aucun résultat dans les 20 activités chargées')).toBeInTheDocument();
    expect(screen.getByText('80 activités restantes')).toBeInTheDocument();
    expect(screen.getByText('Rechercher dans toutes les activités')).toBeInTheDocument();
  });

  it('calls onSearchAll when clicking search button', () => {
    render(<SmartSearchEmptyState {...defaultProps} />);
    fireEvent.click(screen.getByText('Rechercher dans toutes les activités'));
    expect(mockOnSearchAll).toHaveBeenCalled();
  });

  it('displays fallback text when totalCount is undefined', () => {
    render(<SmartSearchEmptyState {...defaultProps} totalCount={undefined} />);
    expect(screen.getByText("Plus d'activités disponibles")).toBeInTheDocument();
  });

  it('displays ? when totalCount is undefined during loading', () => {
    render(
      <SmartSearchEmptyState {...defaultProps} totalCount={undefined} searchLoading={true} />
    );
    expect(screen.getByText('20 / ? activités analysées')).toBeInTheDocument();
  });
});
