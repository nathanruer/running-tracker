import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SourceBadge } from '../source-badge';

describe('SourceBadge', () => {
  it('should render with default orange variant', () => {
    render(<SourceBadge />);

    expect(screen.getByText('Powered by Strava')).toBeInTheDocument();
    expect(screen.getByTitle('Powered by Strava')).toHaveAttribute(
      'href',
      'https://www.strava.com'
    );
  });

  it('should render with orange color', () => {
    render(<SourceBadge variant="orange" />);

    const text = screen.getByText('Powered by Strava');
    expect(text).toHaveStyle({ color: '#FC4C02' });
  });

  it('should render with white color', () => {
    render(<SourceBadge variant="white" />);

    const text = screen.getByText('Powered by Strava');
    expect(text).toHaveStyle({ color: '#FFFFFF' });
  });

  it('should render with black color', () => {
    render(<SourceBadge variant="black" />);

    const text = screen.getByText('Powered by Strava');
    expect(text).toHaveStyle({ color: '#000000' });
  });

  it('should open link in new tab', () => {
    render(<SourceBadge />);

    const link = screen.getByTitle('Powered by Strava');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should apply custom className', () => {
    render(<SourceBadge className="custom-class" />);

    const link = screen.getByTitle('Powered by Strava');
    expect(link).toHaveClass('custom-class');
  });

  it('should render SVG icon', () => {
    const { container } = render(<SourceBadge />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
