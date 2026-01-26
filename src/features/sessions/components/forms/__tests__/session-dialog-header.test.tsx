import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionDialogHeader } from '../session-dialog-header';

vi.mock('@/components/ui/dialog', () => ({
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('SessionDialogHeader', () => {
  const defaultProps = {
    mode: 'create' as const,
    onReset: vi.fn(),
  };

  it('should render title for create mode', () => {
    render(<SessionDialogHeader {...defaultProps} mode="create" />);

    expect(screen.getByText('Ajouter une séance')).toBeInTheDocument();
  });

  it('should render title for edit mode', () => {
    render(<SessionDialogHeader {...defaultProps} mode="edit" />);

    expect(screen.getByText('Modifier la séance')).toBeInTheDocument();
  });

  it('should render title for complete mode', () => {
    render(<SessionDialogHeader {...defaultProps} mode="complete" />);

    expect(screen.getByText('Enregistrer la séance')).toBeInTheDocument();
  });

  it('should render description for create mode', () => {
    render(<SessionDialogHeader {...defaultProps} mode="create" />);

    expect(screen.getByText("Enregistrez votre séance d'entraînement")).toBeInTheDocument();
  });

  it('should render description for edit mode', () => {
    render(<SessionDialogHeader {...defaultProps} mode="edit" />);

    expect(screen.getByText('Modifiez les informations de votre séance')).toBeInTheDocument();
  });

  it('should render description for complete mode', () => {
    render(<SessionDialogHeader {...defaultProps} mode="complete" />);

    expect(screen.getByText('Remplissez les détails de votre séance réalisée')).toBeInTheDocument();
  });

  it('should render reset button', () => {
    render(<SessionDialogHeader {...defaultProps} />);

    expect(screen.getByTestId('btn-session-reset')).toBeInTheDocument();
    expect(screen.getByText('Réinitialiser')).toBeInTheDocument();
  });

  it('should call onReset when reset button is clicked', () => {
    const onReset = vi.fn();
    render(<SessionDialogHeader {...defaultProps} onReset={onReset} />);

    fireEvent.click(screen.getByTestId('btn-session-reset'));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should render close button', () => {
    const { container } = render(<SessionDialogHeader {...defaultProps} />);

    const closeButton = container.querySelector('button');
    expect(closeButton).toBeInTheDocument();
  });
});
