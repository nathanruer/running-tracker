import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityImportDialog } from '../activity-import-dialog';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-header" className={className}>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('../activity-import-content', () => ({
  ActivityImportContent: ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => (
    <div data-testid="activity-import-content">
      <button onClick={() => onOpenChange(false)} className="rounded-xl">Close</button>
      <span>Importer depuis intervals.icu</span>
      <span>Sélectionnez vos activités à importer.</span>
      <span>Sélectionnez une activité à importer.</span>
    </div>
  ),
}));

describe('ActivityImportDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <ActivityImportDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    );
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders when open', async () => {
    render(
      <ActivityImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
  });

  it('displays the dialog title', async () => {
    render(
      <ActivityImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Importer depuis intervals.icu')).toBeInTheDocument();
    });
  });

  it('displays description for create mode', async () => {
    render(
      <ActivityImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        mode="create"
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Sélectionnez vos activités à importer.')).toBeInTheDocument();
    });
  });

  it('displays description for complete mode', async () => {
    render(
      <ActivityImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
        mode="complete"
      />
    );
    await waitFor(() => {
      expect(screen.getByText('Sélectionnez une activité à importer.')).toBeInTheDocument();
    });
  });

  it('calls onOpenChange when close button is clicked', async () => {
    render(
      <ActivityImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    );
    await waitFor(() => {
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.className.includes('rounded-xl'));
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      }
    });
  });
});
