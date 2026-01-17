import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StravaToolbar } from '../strava-toolbar';
import { createRef } from 'react';

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
  const mockOnLoadAll = vi.fn();
  const mockOnReset = vi.fn();
  const mockTopRef = createRef<HTMLTableSectionElement>();

  const defaultProps = {
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    activitiesCount: 20,
    totalCount: 100,
    loading: false,
    hasMore: true,
    loadingAll: false,
    loadingMore: false,
    onLoadAll: mockOnLoadAll,
    onReset: mockOnReset,
    topRef: mockTopRef,
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
    expect(screen.getByText('20 / 100')).toBeInTheDocument();
  });

  it('displays "..." for totalCount when loading', () => {
    render(<StravaToolbar {...defaultProps} totalCount={null} loading={true} />);
    expect(screen.getByText('20 / ...')).toBeInTheDocument();
  });

  it('displays "Tout" button when hasMore is true', () => {
    render(<StravaToolbar {...defaultProps} hasMore={true} />);
    expect(screen.getByText('Tout')).toBeInTheDocument();
  });

  it('calls onLoadAll when "Tout" button is clicked', () => {
    render(<StravaToolbar {...defaultProps} hasMore={true} />);
    const button = screen.getByText('Tout');
    fireEvent.click(button);
    expect(mockOnLoadAll).toHaveBeenCalledTimes(1);
  });

  it('disables "Tout" button when loadingAll is true', () => {
    render(<StravaToolbar {...defaultProps} hasMore={true} loadingAll={true} />);
    const button = screen.getByText('Tout');
    expect(button).toBeDisabled();
  });

  it('displays "Réduire" button when activitiesCount > 20', () => {
    render(<StravaToolbar {...defaultProps} activitiesCount={25} />);
    expect(screen.getByText('Réduire')).toBeInTheDocument();
  });

  it('calls onReset when "Réduire" button is clicked', () => {
    render(<StravaToolbar {...defaultProps} activitiesCount={25} />);
    const button = screen.getByText('Réduire');
    fireEvent.click(button);
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it('does not display "Tout" when hasMore is false', () => {
    render(<StravaToolbar {...defaultProps} hasMore={false} activitiesCount={10} />);
    expect(screen.queryByText('Tout')).not.toBeInTheDocument();
  });

  it('does not display "Réduire" when activitiesCount <= 20', () => {
    render(<StravaToolbar {...defaultProps} activitiesCount={15} hasMore={false} />);
    expect(screen.queryByText('Réduire')).not.toBeInTheDocument();
  });
});
