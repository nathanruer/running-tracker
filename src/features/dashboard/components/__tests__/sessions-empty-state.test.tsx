import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionsEmptyState } from '../sessions-empty-state';

describe('SessionsEmptyState', () => {
  it('should render with default content', () => {
    const onAction = vi.fn();
    render(<SessionsEmptyState onAction={onAction} />);

    expect(screen.getByTestId('sessions-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Votre aventure commence ici')).toBeInTheDocument();
    expect(screen.getByText(/Votre historique est encore vierge/)).toBeInTheDocument();
  });

  it('should render add button with correct text', () => {
    const onAction = vi.fn();
    render(<SessionsEmptyState onAction={onAction} />);

    const button = screen.getByTestId('btn-add-first-session');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Ajouter ma première séance');
  });

  it('should call onAction when button is clicked', () => {
    const onAction = vi.fn();
    render(<SessionsEmptyState onAction={onAction} />);

    const button = screen.getByTestId('btn-add-first-session');
    fireEvent.click(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    const onAction = vi.fn();
    render(<SessionsEmptyState onAction={onAction} className="custom-class" />);

    expect(screen.getByTestId('sessions-empty-state')).toHaveClass('custom-class');
  });

  it('should render Trophy icon', () => {
    const onAction = vi.fn();
    render(<SessionsEmptyState onAction={onAction} />);

    const iconContainer = screen.getByTestId('sessions-empty-state').querySelector('svg');
    expect(iconContainer).toBeInTheDocument();
  });
});
