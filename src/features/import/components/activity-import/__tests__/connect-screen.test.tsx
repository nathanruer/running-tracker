import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConnectScreen } from '../connect-screen';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid="connect-button">
      {children}
    </button>
  ),
}));

vi.mock('../../source-badge', () => ({
  SourceBadge: ({ variant, className }: { variant?: string; className?: string }) => (
    <div data-testid="source-badge" data-variant={variant} className={className}>Strava Badge</div>
  ),
}));

describe('ConnectScreen', () => {
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the connection title', () => {
    render(<ConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByText('Connexion à Strava')).toBeInTheDocument();
  });

  it('displays the connection description', () => {
    render(<ConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByText(/Connectez votre compte pour importer vos données d'entraînement/)).toBeInTheDocument();
  });

  it('displays the connect button text when not loading', () => {
    render(<ConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByText('Se connecter à Strava')).toBeInTheDocument();
  });

  it('calls onConnect when button is clicked', () => {
    render(<ConnectScreen loading={false} onConnect={mockOnConnect} />);
    const button = screen.getByTestId('connect-button');
    fireEvent.click(button);
    expect(mockOnConnect).toHaveBeenCalledTimes(1);
  });

  it('disables button when loading', () => {
    render(<ConnectScreen loading={true} onConnect={mockOnConnect} />);
    const button = screen.getByTestId('connect-button');
    expect(button).toBeDisabled();
  });

  it('displays OAuth security text', () => {
    render(<ConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByText('Sécurisé via OAuth 2.0')).toBeInTheDocument();
  });

  it('displays the Strava badge', () => {
    render(<ConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByTestId('source-badge')).toBeInTheDocument();
  });
});
