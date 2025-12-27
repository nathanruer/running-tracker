import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CsvImportActions } from '../csv-import-actions';

describe('CsvImportActions', () => {
  it('should render cancel and import buttons', () => {
    const mockOnCancel = vi.fn();
    const mockOnImport = vi.fn();

    render(
      <CsvImportActions
        isImporting={false}
        selectedCount={5}
        onCancel={mockOnCancel}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importer 5 séance/i })).toBeInTheDocument();
  });

  it('should show singular text for 1 session', () => {
    const mockOnCancel = vi.fn();
    const mockOnImport = vi.fn();

    render(
      <CsvImportActions
        isImporting={false}
        selectedCount={1}
        onCancel={mockOnCancel}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByRole('button', { name: /importer 1 séance/i })).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCancel = vi.fn();
    const mockOnImport = vi.fn();

    render(
      <CsvImportActions
        isImporting={false}
        selectedCount={3}
        onCancel={mockOnCancel}
        onImport={mockOnImport}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it('should call onImport when import button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCancel = vi.fn();
    const mockOnImport = vi.fn();

    render(
      <CsvImportActions
        isImporting={false}
        selectedCount={2}
        onCancel={mockOnCancel}
        onImport={mockOnImport}
      />
    );

    const importButton = screen.getByRole('button', { name: /importer 2 séance/i });
    await user.click(importButton);

    expect(mockOnImport).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('should disable import button when selectedCount is 0', () => {
    const mockOnCancel = vi.fn();
    const mockOnImport = vi.fn();

    render(
      <CsvImportActions
        isImporting={false}
        selectedCount={0}
        onCancel={mockOnCancel}
        onImport={mockOnImport}
      />
    );

    const importButton = screen.getByRole('button', { name: /importer 0 séance/i });
    expect(importButton).toBeDisabled();
  });

  it('should disable both buttons when importing', () => {
    const mockOnCancel = vi.fn();
    const mockOnImport = vi.fn();

    render(
      <CsvImportActions
        isImporting={true}
        selectedCount={5}
        onCancel={mockOnCancel}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByRole('button', { name: /annuler/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /import en cours/i })).toBeDisabled();
  });

  it('should show loading state when importing', () => {
    const mockOnCancel = vi.fn();
    const mockOnImport = vi.fn();

    const { container } = render(
      <CsvImportActions
        isImporting={true}
        selectedCount={5}
        onCancel={mockOnCancel}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText(/import en cours/i)).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
