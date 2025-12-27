import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SessionDialogActions } from '../session-dialog-actions';

describe('SessionDialogActions', () => {
  it('should render cancel and submit buttons in create mode', () => {
    const mockOnCancel = vi.fn();

    render(
      <SessionDialogActions
        mode="create"
        loading={false}
        hasSession={false}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });

  it('should show "Modifier" in edit mode with existing session', () => {
    const mockOnCancel = vi.fn();

    render(
      <SessionDialogActions
        mode="edit"
        loading={false}
        hasSession={true}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('button', { name: /^modifier$/i })).toBeInTheDocument();
  });

  it('should show three buttons in complete mode', () => {
    const mockOnCancel = vi.fn();
    const mockOnUpdate = vi.fn();

    render(
      <SessionDialogActions
        mode="complete"
        loading={false}
        hasSession={true}
        onCancel={mockOnCancel}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^modifier$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modifier et marquer comme réalisé/i })).toBeInTheDocument();
  });

  it('should disable submit button when loading', () => {
    const mockOnCancel = vi.fn();

    render(
      <SessionDialogActions
        mode="create"
        loading={true}
        hasSession={false}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /enregistrement/i });
    expect(submitButton).toBeDisabled();
  });

  it('should show loading text when loading', () => {
    const mockOnCancel = vi.fn();

    render(
      <SessionDialogActions
        mode="create"
        loading={true}
        hasSession={false}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/enregistrement\.\.\./i)).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCancel = vi.fn();

    render(
      <SessionDialogActions
        mode="create"
        loading={false}
        hasSession={false}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onUpdate when modifier button is clicked in complete mode', async () => {
    const user = userEvent.setup();
    const mockOnCancel = vi.fn();
    const mockOnUpdate = vi.fn();

    render(
      <SessionDialogActions
        mode="complete"
        loading={false}
        hasSession={true}
        onCancel={mockOnCancel}
        onUpdate={mockOnUpdate}
      />
    );

    const updateButton = screen.getByRole('button', { name: /^modifier$/i });
    await user.click(updateButton);

    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
  });
});
