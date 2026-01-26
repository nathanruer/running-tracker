import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StravaBadge, StravaConnectButton } from '../strava-badge';

describe('StravaBadge', () => {
  it('should render with default orange variant', () => {
    render(<StravaBadge />);

    expect(screen.getByText('Powered by Strava')).toBeInTheDocument();
    expect(screen.getByTitle('Powered by Strava')).toHaveAttribute(
      'href',
      'https://www.strava.com'
    );
  });

  it('should render with orange color', () => {
    render(<StravaBadge variant="orange" />);

    const text = screen.getByText('Powered by Strava');
    expect(text).toHaveStyle({ color: '#FC4C02' });
  });

  it('should render with white color', () => {
    render(<StravaBadge variant="white" />);

    const text = screen.getByText('Powered by Strava');
    expect(text).toHaveStyle({ color: '#FFFFFF' });
  });

  it('should render with black color', () => {
    render(<StravaBadge variant="black" />);

    const text = screen.getByText('Powered by Strava');
    expect(text).toHaveStyle({ color: '#000000' });
  });

  it('should open link in new tab', () => {
    render(<StravaBadge />);

    const link = screen.getByTitle('Powered by Strava');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should apply custom className', () => {
    render(<StravaBadge className="custom-class" />);

    const link = screen.getByTitle('Powered by Strava');
    expect(link).toHaveClass('custom-class');
  });

  it('should render SVG icon', () => {
    const { container } = render(<StravaBadge />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('StravaConnectButton', () => {
  it('should render connect button text', () => {
    render(<StravaConnectButton onClick={() => {}} />);

    expect(screen.getByText('Se connecter avec Strava')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<StravaConnectButton onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should show loading text when loading', () => {
    render(<StravaConnectButton onClick={() => {}} loading />);

    expect(screen.getByText('Connexion...')).toBeInTheDocument();
    expect(screen.queryByText('Se connecter avec Strava')).not.toBeInTheDocument();
  });

  it('should be disabled when loading', () => {
    render(<StravaConnectButton onClick={() => {}} loading />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not be disabled when not loading', () => {
    render(<StravaConnectButton onClick={() => {}} />);

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should apply custom className', () => {
    render(<StravaConnectButton onClick={() => {}} className="custom-class" />);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should have strava orange background color', () => {
    render(<StravaConnectButton onClick={() => {}} />);

    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: '#FC4C02' });
  });

  it('should not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<StravaConnectButton onClick={onClick} loading />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
