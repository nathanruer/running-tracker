import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScopeIndicator } from '../scope-indicator';

describe('ScopeIndicator', () => {
  const defaultProps = {
    loadedCount: 20,
    totalCount: 100,
    hasMore: true,
  };

  it('displays loaded/total count with default unit when hasMore', () => {
    render(<ScopeIndicator {...defaultProps} />);
    expect(screen.getByText('20 / 100 activités')).toBeInTheDocument();
  });

  it('displays only loaded count when no more pages', () => {
    render(<ScopeIndicator {...defaultProps} hasMore={false} />);
    expect(screen.getByText('20 activités')).toBeInTheDocument();
  });

  it('uses custom unit', () => {
    render(<ScopeIndicator {...defaultProps} unit="séances" />);
    expect(screen.getByText('20 / 100 séances')).toBeInTheDocument();
  });

  it('displays search progress when searchLoading', () => {
    render(
      <ScopeIndicator
        {...defaultProps}
        searchLoading={true}
        searchProgress={{ loaded: 45, total: 100 }}
      />
    );
    expect(screen.getByText(/45\/100/)).toBeInTheDocument();
  });

  it('displays ? when total is unknown during search', () => {
    render(
      <ScopeIndicator
        {...defaultProps}
        searchLoading={true}
        totalCount={undefined}
        searchProgress={{ loaded: 20, total: 0 }}
      />
    );
    expect(screen.getByText(/20\/\?/)).toBeInTheDocument();
  });

  it('has animated spin indicator when searchLoading', () => {
    render(
      <ScopeIndicator
        {...defaultProps}
        searchLoading={true}
        searchProgress={{ loaded: 20, total: 100 }}
      />
    );
    const indicator = document.querySelector('.animate-spin');
    expect(indicator).toBeInTheDocument();
  });

  it('displays compact text for mobile', () => {
    render(<ScopeIndicator {...defaultProps} />);
    expect(screen.getByText('20/100')).toBeInTheDocument();
  });

  it('renders Tout charger button when hasMore and onLoadAll provided', () => {
    render(
      <ScopeIndicator {...defaultProps} onLoadAll={vi.fn()} />
    );
    expect(screen.getByText('Tout charger')).toBeInTheDocument();
  });

  it('calls onLoadAll when clicking Tout charger', () => {
    const onLoadAll = vi.fn();
    render(
      <ScopeIndicator {...defaultProps} onLoadAll={onLoadAll} />
    );
    fireEvent.click(screen.getByText('Tout charger'));
    expect(onLoadAll).toHaveBeenCalled();
  });

  it('renders Annuler button when isLoadingAll', () => {
    render(
      <ScopeIndicator
        {...defaultProps}
        onLoadAll={vi.fn()}
        isLoadingAll={true}
        onCancelLoadAll={vi.fn()}
      />
    );
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('calls onCancelLoadAll when clicking Annuler', () => {
    const onCancel = vi.fn();
    render(
      <ScopeIndicator
        {...defaultProps}
        onLoadAll={vi.fn()}
        isLoadingAll={true}
        onCancelLoadAll={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Annuler'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows Loader2 spinner when isFetching', () => {
    render(
      <ScopeIndicator {...defaultProps} isFetching={true} />
    );
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
