import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EndOfList } from '../end-of-list';

describe('EndOfList', () => {
  it('renders default label when visible', () => {
    render(<EndOfList visible={true} />);
    expect(screen.getByText("Fin de l'historique")).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<EndOfList visible={true} label="Aucune autre donnée" />);
    expect(screen.getByText('Aucune autre donnée')).toBeInTheDocument();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(<EndOfList visible={false} />);
    expect(container.firstChild).toBeNull();
  });
});
