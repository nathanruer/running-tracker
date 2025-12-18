import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StravaImportDialog } from '@/components/strava-import-dialog';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

describe('StravaImportDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders correctly when open and not connected', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 401,
      ok: false,
    } as Response);

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
    vi.mocked(global.fetch).mockResolvedValue({
      status: 401,
      ok: false,
    } as Response);

    const originalLocation = window.location;
    // @ts-expect-error - we need to delete location to mock it
    delete window.location;
    // @ts-expect-error - we need to assign a mock location
    window.location = { href: '' } as Location;

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

    // @ts-expect-error - restoring original location
    window.location = originalLocation;
  });
});
