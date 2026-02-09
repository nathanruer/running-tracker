import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StravaImportFooter } from '../strava-import-footer';

describe('StravaImportFooter', () => {
  const defaultProps = {
    selectedCount: 5,
    status: 'idle' as const,
    progress: { imported: 0, total: 0 },
    onCancel: vi.fn(),
    onImport: vi.fn(),
    onCancelImport: vi.fn(),
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

  it('should show progress bar when importing', () => {
    render(<StravaImportFooter {...defaultProps} status="importing" progress={{ imported: 5, total: 10 }} />);

    expect(screen.getByText('5 sur 10')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('Importer 5 activités')).not.toBeInTheDocument();
  });

  it('should disable import button when selectedCount is 0', () => {
    render(<StravaImportFooter {...defaultProps} selectedCount={0} />);

    const importButton = screen.getByText('Importer 0 activité').closest('button');
    expect(importButton).toBeDisabled();
  });

  it('should enable import button when idle and selectedCount > 0', () => {
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

  it('should show cancel button that calls onCancelImport during import', () => {
    const onCancelImport = vi.fn();
    render(
      <StravaImportFooter {...defaultProps} status="importing" progress={{ imported: 2, total: 10 }} onCancelImport={onCancelImport} />
    );

    fireEvent.click(screen.getByText('Annuler'));

    expect(onCancelImport).toHaveBeenCalledTimes(1);
  });

  it('should show Fermer button and amber state on error', () => {
    render(<StravaImportFooter {...defaultProps} status="error" progress={{ imported: 3, total: 10 }} />);

    expect(screen.getByText('Fermer')).toBeInTheDocument();
    expect(screen.getByText(/interrompu/)).toBeInTheDocument();
  });

  it('should show Fermer button and partial count on cancelled', () => {
    render(<StravaImportFooter {...defaultProps} status="cancelled" progress={{ imported: 7, total: 10 }} />);

    expect(screen.getByText('Fermer')).toBeInTheDocument();
    expect(screen.getByText('7 sur 10 importées — interrompu')).toBeInTheDocument();
  });

  it('should call onCancel when Fermer is clicked in terminal state', () => {
    const onCancel = vi.fn();
    render(<StravaImportFooter {...defaultProps} status="error" progress={{ imported: 3, total: 10 }} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Fermer'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should show percentage during import', () => {
    render(<StravaImportFooter {...defaultProps} status="importing" progress={{ imported: 75, total: 100 }} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('75 sur 100')).toBeInTheDocument();
  });
});
