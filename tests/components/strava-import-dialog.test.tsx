import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StravaImportDialog } from '@/components/strava-import-dialog';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe('StravaImportDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders correctly when open and not connected', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 401,
      ok: false,
    });

    render(
      <StravaImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText('Importer depuis Strava')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Connectez-vous à Strava/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Se connecter avec Strava/i })).toBeInTheDocument();
  });

  it('redirects to authorization url when connect button is clicked', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 401,
      ok: false,
    });

    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(
      <StravaImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Se connecter avec Strava/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Se connecter avec Strava/i }));

    expect(window.location.href).toBe('/api/auth/strava/authorize');

    (window as any).location = originalLocation;
  });
});
