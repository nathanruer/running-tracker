import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceBadge } from '../source-badge';

describe('SourceBadge', () => {
  it('links to intervals.icu with the source attribution', () => {
    render(<SourceBadge />);

    const link = screen.getByRole('link', { name: /intervals\.icu/i });
    expect(link).toHaveAttribute('href', 'https://intervals.icu');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('accepts extra classes', () => {
    render(<SourceBadge className="mt-4" />);

    expect(screen.getByRole('link')).toHaveClass('mt-4');
  });
});
