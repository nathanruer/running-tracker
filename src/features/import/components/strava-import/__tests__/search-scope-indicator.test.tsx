import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SearchScopeIndicator } from '../search-scope-indicator';

describe('SearchScopeIndicator', () => {
  const defaultProps = {
    loadedCount: 20,
    totalCount: 100,
    hasMore: true,
    searchLoading: false,
    searchProgress: { loaded: 20, total: 100 },
    filteredCount: 20,
    searchQuery: '',
  };

  it('displays loaded/total count when hasMore', () => {
    render(<SearchScopeIndicator {...defaultProps} />);
    expect(screen.getByText('20 / 100 activités')).toBeInTheDocument();
  });

  it('displays only loaded count when no more pages', () => {
    render(<SearchScopeIndicator {...defaultProps} hasMore={false} />);
    expect(screen.getByText('20 activités')).toBeInTheDocument();
  });

  it('displays search progress when searchLoading', () => {
    render(
      <SearchScopeIndicator
        {...defaultProps}
        searchLoading={true}
        searchProgress={{ loaded: 45, total: 100 }}
      />
    );
    expect(screen.getByText('Recherche... 45/100')).toBeInTheDocument();
  });

  it('displays filtered count when searching with hasMore', () => {
    render(
      <SearchScopeIndicator {...defaultProps} searchQuery="marathon" filteredCount={5} />
    );
    expect(screen.getByText('5 sur 20 chargées')).toBeInTheDocument();
  });

  it('displays result count when searching without hasMore', () => {
    render(
      <SearchScopeIndicator
        {...defaultProps}
        searchQuery="marathon"
        filteredCount={5}
        hasMore={false}
      />
    );
    expect(screen.getByText('5 résultat(s)')).toBeInTheDocument();
  });

  it('displays ? when totalCount is undefined during search', () => {
    render(
      <SearchScopeIndicator
        {...defaultProps}
        searchLoading={true}
        totalCount={undefined}
        searchProgress={{ loaded: 20, total: 0 }}
      />
    );
    expect(screen.getByText('Recherche... 20/?')).toBeInTheDocument();
  });

  it('has animated pulse indicator when searchLoading', () => {
    render(<SearchScopeIndicator {...defaultProps} searchLoading={true} />);
    const indicator = document.querySelector('.animate-pulse');
    expect(indicator).toBeInTheDocument();
  });
});
