import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportSessions } from '@/features/dashboard/components/export-sessions';

vi.mock('@/lib/services/api-client', () => ({
  getSessions: vi.fn().mockResolvedValue([]),
  getSessionsCount: vi.fn().mockResolvedValue(0),
}));

describe('ExportSessions', () => {
  it('renders dialog with export options when open', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByText('Exporter l\'historique')).toBeInTheDocument();
    expect(screen.getByText('Configurez vos préférences pour récupérer vos données.')).toBeInTheDocument();
  });

  it('shows export format buttons', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByRole('button', { name: /CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /JSON/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Excel/i })).toBeInTheDocument();
  });

  it('export buttons are not disabled by default', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    const csvButton = screen.getByRole('button', { name: /CSV/i });
    const jsonButton = screen.getByRole('button', { name: /JSON/i });
    const excelButton = screen.getByRole('button', { name: /Excel/i });

    expect(csvButton).not.toBeDisabled();
    expect(jsonButton).not.toBeDisabled();
    expect(excelButton).not.toBeDisabled();
  });
});
