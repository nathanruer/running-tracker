import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SelectionBar } from '../selection-bar';

describe('SelectionBar', () => {
  it('should render with singular text for 1 selected session', () => {
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <SelectionBar
        selectedCount={1}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('1 séance sélectionnée')).toBeInTheDocument();
  });

  it('should render with plural text for multiple selected sessions', () => {
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <SelectionBar
        selectedCount={5}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('5 séances sélectionnées')).toBeInTheDocument();
  });

  it('should call onClear when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <SelectionBar
        selectedCount={3}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <SelectionBar
        selectedCount={2}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /supprimer/i });
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnClear).not.toHaveBeenCalled();
  });

  it('should render trash icon in delete button', () => {
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    const { container } = render(
      <SelectionBar
        selectedCount={4}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    const trashIcon = container.querySelector('.lucide-trash-2');
    expect(trashIcon).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    const { container } = render(
      <SelectionBar
        selectedCount={2}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    const selectionBar = container.firstChild;
    expect(selectionBar).toHaveClass('rounded-md', 'bg-muted/40', 'border', 'border-border');
  });

  it('should render both buttons with correct roles', () => {
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <SelectionBar
        selectedCount={3}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument();
  });

  it('should handle zero selected count', () => {
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <SelectionBar
        selectedCount={0}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('0 séance sélectionnée')).toBeInTheDocument();
  });

  it('should handle large selected counts', () => {
    const mockOnClear = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <SelectionBar
        selectedCount={99}
        onClear={mockOnClear}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('99 séances sélectionnées')).toBeInTheDocument();
  });
});
