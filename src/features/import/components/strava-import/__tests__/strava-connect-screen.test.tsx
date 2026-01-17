import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StravaConnectScreen } from '../strava-connect-screen';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid="connect-button">
      {children}
    </button>
  ),
}));

vi.mock('../../strava-badge', () => ({
  StravaBadge: ({ variant, className }: { variant?: string; className?: string }) => (
    <div data-testid="strava-badge" data-variant={variant} className={className}>Strava Badge</div>
  ),
}));

describe('StravaConnectScreen', () => {
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the connection title', () => {
    render(<StravaConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByText('Connexion à Strava')).toBeInTheDocument();
  });

  it('displays the connection description', () => {
    render(<StravaConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByText(/Connectez votre compte pour importer vos données d'entraînement/)).toBeInTheDocument();
  });

  it('displays the connect button text when not loading', () => {
    render(<StravaConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByText('Se connecter à Strava')).toBeInTheDocument();
  });

  it('calls onConnect when button is clicked', () => {
    render(<StravaConnectScreen loading={false} onConnect={mockOnConnect} />);
    const button = screen.getByTestId('connect-button');
    fireEvent.click(button);
    expect(mockOnConnect).toHaveBeenCalledTimes(1);
  });

  it('disables button when loading', () => {
    render(<StravaConnectScreen loading={true} onConnect={mockOnConnect} />);
    const button = screen.getByTestId('connect-button');
    expect(button).toBeDisabled();
  });

  it('displays OAuth security text', () => {
    render(<StravaConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByText('Sécurisé via OAuth 2.0')).toBeInTheDocument();
  });

  it('displays the Strava badge', () => {
    render(<StravaConnectScreen loading={false} onConnect={mockOnConnect} />);
    expect(screen.getByTestId('strava-badge')).toBeInTheDocument();
  });
});
