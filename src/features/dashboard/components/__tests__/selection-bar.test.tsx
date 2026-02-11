import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SelectionBar } from '../selection-bar';

describe('SelectionBar', () => {
  const defaultProps = {
    selectedCount: 1,
    onClear: vi.fn(),
    onDelete: vi.fn(),
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
    expect(buttons).toHaveLength(2);

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
    expect(screen.getByTestId('bulk-delete-button')).toBeInTheDocument();
  });

  it('should render enrich button when provided', async () => {
    const user = userEvent.setup();
    const mockOnEnrich = vi.fn();

    render(
      <SelectionBar
        {...defaultProps}
        onEnrich={mockOnEnrich}
        selectedCount={3}
        enrichCount={3}
      />
    );

    const enrichButton = screen.getByTestId('bulk-enrich-button');
    expect(enrichButton).toHaveTextContent('Enrichir (3)');

    await user.click(enrichButton);
    expect(mockOnEnrich).toHaveBeenCalledTimes(1);
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

  it('should show deleting state with spinner when isDeleting', () => {
    render(<SelectionBar {...defaultProps} selectedCount={5} isDeleting={true} />);

    expect(screen.getByText('Suppression en cours…')).toBeInTheDocument();
    expect(screen.queryByText('Sélectionnées')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bulk-delete-button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /annuler/i })).not.toBeInTheDocument();
  });

  it('should show normal state when isDeleting is false', () => {
    render(<SelectionBar {...defaultProps} selectedCount={5} isDeleting={false} />);

    expect(screen.queryByText('Suppression en cours…')).not.toBeInTheDocument();
    expect(screen.getByText('Sélectionnées')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-delete-button')).toBeInTheDocument();
  });
});
