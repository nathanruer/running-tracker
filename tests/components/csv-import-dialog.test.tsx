import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CsvImportDialog } from '@/components/csv-import-dialog';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe('CsvImportDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnImport = vi.fn();

  it('renders correctly when open', () => {
    render(
      <CsvImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText('Importer des séances depuis CSV')).toBeInTheDocument();
    expect(screen.getByText(/Sélectionnez un fichier CSV/i)).toBeInTheDocument();
  });

  it('shows instructions for required columns', () => {
    render(
      <CsvImportDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText(/Colonnes attendues :/i)).toBeInTheDocument();
    expect(screen.getByText(/Date, Séance, Durée, Distance/i)).toBeInTheDocument();
  });
});
