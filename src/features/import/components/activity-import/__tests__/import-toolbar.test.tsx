import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportToolbar } from '../import-toolbar';

vi.mock('@/components/ui/search-input', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

describe('ImportToolbar', () => {
  const mockOnSearchChange = vi.fn();
  const mockOnLoadAll = vi.fn();
  const mockOnCancelLoadAll = vi.fn();

  const mockOnToggleDismissed = vi.fn();

  const defaultProps = {
    dismissedCount: 0,
    showDismissed: false,
    onToggleDismissed: mockOnToggleDismissed,
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    activitiesCount: 20,
    totalCount: 100,
    filteredCount: 20,
    loading: false,
    hasMore: true,
    searchLoading: false,
    isLoadingAll: false,
    searchProgress: { loaded: 20, total: 100 },
    onLoadAll: mockOnLoadAll,
    onCancelLoadAll: mockOnCancelLoadAll,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the search input', () => {
    render(<ImportToolbar {...defaultProps} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', () => {
    render(<ImportToolbar {...defaultProps} />);
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockOnSearchChange).toHaveBeenCalledWith('test');
  });

  it('displays activities count with total when hasMore', () => {
    render(<ImportToolbar {...defaultProps} />);
    expect(screen.getByText('20 / 100 activités')).toBeInTheDocument();
  });

  it('displays skeleton placeholder when loading', () => {
    const { container } = render(<ImportToolbar {...defaultProps} loading={true} />);
    const skeleton = container.querySelector('.animate-pulse.rounded-full');
    expect(skeleton).toBeInTheDocument();
  });

  it('displays Tout charger button when hasMore', () => {
    render(<ImportToolbar {...defaultProps} />);
    expect(screen.getByText('Tout charger')).toBeInTheDocument();
  });

  it('calls onLoadAll when clicking Tout charger', () => {
    render(<ImportToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Tout charger'));
    expect(mockOnLoadAll).toHaveBeenCalled();
  });

  it('displays search progress when searchLoading', () => {
    render(<ImportToolbar {...defaultProps} searchLoading={true} />);
    expect(screen.getByText(/Recherche/)).toBeInTheDocument();
  });

  it('displays spin indicator when searchLoading', () => {
    const { container } = render(<ImportToolbar {...defaultProps} searchLoading={true} />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not show Tout charger when all pages loaded', () => {
    render(<ImportToolbar {...defaultProps} hasMore={false} totalCount={20} />);
    const actionWrapper = document.querySelector('[class*="max-w-0"]');
    expect(actionWrapper).toBeInTheDocument();
  });
  it('offers to show the ignored activities only when there are some', () => {
    const { rerender } = render(<ImportToolbar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /ignorées/i })).toBeNull();

    rerender(<ImportToolbar {...defaultProps} dismissedCount={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ignorées (2)' }));
    expect(mockOnToggleDismissed).toHaveBeenCalledTimes(1);

    rerender(<ImportToolbar {...defaultProps} dismissedCount={2} showDismissed />);
    expect(screen.getByRole('button', { name: 'Masquer les ignorées' })).toBeInTheDocument();
  });

});
