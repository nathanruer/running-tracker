import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CsvPreviewActions } from '../csv-preview-actions';

describe('CsvPreviewActions', () => {
  it('should display session count', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={5}
        selectedCount={0}
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    expect(screen.getByText('5 séance(s) détectée(s)')).toBeInTheDocument();
  });

  it('should show "Tout sélectionner" when no sessions are selected', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={0}
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    expect(screen.getByRole('button', { name: /tout sélectionner/i })).toBeInTheDocument();
  });

  it('should show "Tout désélectionner" when all sessions are selected', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={10}
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    expect(screen.getByRole('button', { name: /tout désélectionner/i })).toBeInTheDocument();
  });

  it('should show "Tout sélectionner" when some sessions are selected', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={5}
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    expect(screen.getByRole('button', { name: /tout sélectionner/i })).toBeInTheDocument();
  });

  it('should call onToggleSelectAll when toggle button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={0}
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /tout sélectionner/i });
    await user.click(toggleButton);

    expect(mockOnToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it('should hide select all button in complete mode', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={5}
        mode="complete"
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    expect(screen.queryByRole('button', { name: /tout sélectionner/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tout désélectionner/i })).not.toBeInTheDocument();
  });

  it('should show select all button in create mode', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={0}
        mode="create"
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    expect(screen.getByRole('button', { name: /tout sélectionner/i })).toBeInTheDocument();
  });

  it('should show select all button in edit mode', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={0}
        mode="edit"
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    expect(screen.getByRole('button', { name: /tout sélectionner/i })).toBeInTheDocument();
  });

  it('should render change file button', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={0}
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    expect(screen.getByText(/changer de fichier/i)).toBeInTheDocument();
  });

  it('should render file input for changing file', () => {
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={0}
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    const fileInput = document.querySelector<HTMLInputElement>('#csv-upload-replace');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput?.type).toBe('file');
    expect(fileInput?.accept).toBe('.csv,.txt,.json');
  });

  it('should call onChangeFile when new file is selected', async () => {
    const user = userEvent.setup();
    const mockOnToggleSelectAll = vi.fn();
    const mockOnChangeFile = vi.fn();

    render(
      <CsvPreviewActions
        sessionCount={10}
        selectedCount={0}
        onToggleSelectAll={mockOnToggleSelectAll}
        onChangeFile={mockOnChangeFile}
      />
    );

    const file = new File(['new content'], 'new.csv', { type: 'text/csv' });
    const fileInput = document.querySelector<HTMLInputElement>('#csv-upload-replace')!;

    await user.upload(fileInput, file);

    expect(mockOnChangeFile).toHaveBeenCalled();
  });
});
