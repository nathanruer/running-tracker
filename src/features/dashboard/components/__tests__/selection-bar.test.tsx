import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SelectionBar } from '../selection-bar';

describe('SelectionBar', () => {
  const defaultProps = {
    selectedCount: 1,
    onClear: vi.fn(),
    onDelete: vi.fn(),
    onExport: vi.fn(),
  };

  it('should render with singular text for 1 selected session', () => {
    render(<SelectionBar {...defaultProps} selectedCount={1} />);
    expect(screen.getByTestId('selection-count')).toHaveTextContent('1');
    expect(screen.getByText('Sélectionnée')).toBeInTheDocument();
  });

  it('should render with plural text for multiple selected sessions', () => {
    render(<SelectionBar {...defaultProps} selectedCount={5} />);
    expect(screen.getByTestId('selection-count')).toHaveTextContent('5');
    expect(screen.getByText('Sélectionnées')).toBeInTheDocument();
  });

  it('should call onClear when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClear = vi.fn();

    render(<SelectionBar {...defaultProps} onClear={mockOnClear} />);

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();

    render(<SelectionBar {...defaultProps} onDelete={mockOnDelete} selectedCount={2} />);

    const deleteButton = screen.getByTestId('bulk-delete-button');
    expect(deleteButton).toHaveTextContent('Supprimer (2)');
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('should call onExport when export button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnExport = vi.fn();

    render(<SelectionBar {...defaultProps} onExport={mockOnExport} selectedCount={3} />);

    const exportButton = screen.getByTestId('btn-export-selected');
    expect(exportButton).toHaveTextContent('Exporter (3)');
    await user.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });

  it('should render trash icon in delete button', () => {
    const { container } = render(<SelectionBar {...defaultProps} />);
    const trashIcon = container.querySelector('.lucide-trash-2');
    expect(trashIcon).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    const { container } = render(<SelectionBar {...defaultProps} />);
    const selectionBar = container.firstChild;
    expect(selectionBar).toHaveClass('rounded-xl', 'border');
  });

  it('should render all buttons with correct roles', () => {
    render(<SelectionBar {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
    expect(screen.getByTestId('btn-export-selected')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-delete-button')).toBeInTheDocument();
  });

  it('should handle zero selected count', () => {
    render(<SelectionBar {...defaultProps} selectedCount={0} />);
    expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
    expect(screen.getByText('Sélectionnée')).toBeInTheDocument();
  });

  it('should handle large selected counts', () => {
    render(<SelectionBar {...defaultProps} selectedCount={99} />);
    expect(screen.getByTestId('selection-count')).toHaveTextContent('99');
    expect(screen.getByText('Sélectionnées')).toBeInTheDocument();
  });
});
