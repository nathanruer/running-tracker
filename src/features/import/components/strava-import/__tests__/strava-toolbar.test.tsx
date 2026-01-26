import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StravaToolbar } from '../strava-toolbar';

vi.mock('@/components/ui/search-input', () => ({
  SearchInput: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

describe('StravaToolbar', () => {
  const mockOnSearchChange = vi.fn();

  const defaultProps = {
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    activitiesCount: 20,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the search input', () => {
    render(<StravaToolbar {...defaultProps} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', () => {
    render(<StravaToolbar {...defaultProps} />);
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockOnSearchChange).toHaveBeenCalledWith('test');
  });

  it('displays activities count', () => {
    render(<StravaToolbar {...defaultProps} />);
    expect(screen.getByText('20 activités')).toBeInTheDocument();
  });

  it('displays "..." when loading', () => {
    render(<StravaToolbar {...defaultProps} loading={true} />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('displays correct count with different values', () => {
    render(<StravaToolbar {...defaultProps} activitiesCount={45} />);
    expect(screen.getByText('45 activités')).toBeInTheDocument();
  });

  it('displays 0 activités when count is 0', () => {
    render(<StravaToolbar {...defaultProps} activitiesCount={0} />);
    expect(screen.getByText('0 activités')).toBeInTheDocument();
  });
});
