import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchAllButton } from '../search-all-button';

describe('SearchAllButton', () => {
  const mockOnLoadAll = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    hasMore: true,
    searchLoading: false,
    onLoadAll: mockOnLoadAll,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays Tout charger button when hasMore', () => {
    render(<SearchAllButton {...defaultProps} />);
    expect(screen.getByText('Tout charger')).toBeInTheDocument();
  });

  it('calls onLoadAll when clicking Tout charger', () => {
    render(<SearchAllButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Tout charger'));
    expect(mockOnLoadAll).toHaveBeenCalled();
  });

  it('displays Annuler button when searchLoading', () => {
    render(<SearchAllButton {...defaultProps} searchLoading={true} />);
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('calls onCancel when clicking Annuler', () => {
    render(<SearchAllButton {...defaultProps} searchLoading={true} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('returns null when no hasMore and not searchLoading', () => {
    const { container } = render(
      <SearchAllButton {...defaultProps} hasMore={false} searchLoading={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows Annuler even when hasMore is false but searchLoading is true', () => {
    render(<SearchAllButton {...defaultProps} hasMore={false} searchLoading={true} />);
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });
});
