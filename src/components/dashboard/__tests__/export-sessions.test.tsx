import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportSessions } from '@/components/dashboard/export-sessions';

vi.mock('@/lib/services/api-client', () => ({
  getSessions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe('ExportSessions', () => {
  it('renders export button', () => {
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[]}
      />
    );
    expect(screen.getByRole('button', { name: /Exporter tout/i })).toBeInTheDocument();
  });

  it('shows dropdown menu with export options', () => {
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[]}
      />
    );
    const items = screen.getAllByTestId('dropdown-item');
    expect(items.length).toBe(3);
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
  });

  it('button is not disabled by default', () => {
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[]}
      />
    );
    const button = screen.getByRole('button', { name: /Exporter/i });
    expect(button).not.toBeDisabled();
  });
});
