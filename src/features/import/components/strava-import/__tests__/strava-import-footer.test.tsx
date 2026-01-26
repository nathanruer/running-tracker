import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StravaImportFooter } from '../strava-import-footer';

describe('StravaImportFooter', () => {
  const defaultProps = {
    selectedCount: 5,
    importing: false,
    onCancel: vi.fn(),
    onImport: vi.fn(),
  };

  it('should render cancel button', () => {
    render(<StravaImportFooter {...defaultProps} />);

    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('should render import button with selected count', () => {
    render(<StravaImportFooter {...defaultProps} />);

    expect(screen.getByText('Importer 5 activités')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<StravaImportFooter {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Annuler'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onImport when import button is clicked', () => {
    const onImport = vi.fn();
    render(<StravaImportFooter {...defaultProps} onImport={onImport} />);

    fireEvent.click(screen.getByText('Importer 5 activités'));

    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('should show loading state when importing', () => {
    render(<StravaImportFooter {...defaultProps} importing />);

    expect(screen.getByText('Import...')).toBeInTheDocument();
    expect(screen.queryByText('Importer 5 activités')).not.toBeInTheDocument();
  });

  it('should disable import button when importing', () => {
    render(<StravaImportFooter {...defaultProps} importing />);

    const importButton = screen.getByText('Import...').closest('button');
    expect(importButton).toBeDisabled();
  });

  it('should disable import button when selectedCount is 0', () => {
    render(<StravaImportFooter {...defaultProps} selectedCount={0} />);

    const importButton = screen.getByText('Importer 0 activité').closest('button');
    expect(importButton).toBeDisabled();
  });

  it('should enable import button when not importing and selectedCount > 0', () => {
    render(<StravaImportFooter {...defaultProps} />);

    const importButton = screen.getByText('Importer 5 activités').closest('button');
    expect(importButton).not.toBeDisabled();
  });

  it('should update selected count text dynamically', () => {
    const { rerender } = render(<StravaImportFooter {...defaultProps} selectedCount={3} />);

    expect(screen.getByText('Importer 3 activités')).toBeInTheDocument();

    rerender(<StravaImportFooter {...defaultProps} selectedCount={1} />);

    expect(screen.getByText('Importer 1 activité')).toBeInTheDocument();

    rerender(<StravaImportFooter {...defaultProps} selectedCount={10} />);

    expect(screen.getByText('Importer 10 activités')).toBeInTheDocument();
  });

  it('should show loading spinner when importing', () => {
    const { container } = render(<StravaImportFooter {...defaultProps} importing />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
