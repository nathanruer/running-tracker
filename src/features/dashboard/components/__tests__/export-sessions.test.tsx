import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportSessions } from '@/features/dashboard/components/export-sessions';

vi.mock('@/lib/services/api-client', () => ({
  getSessions: vi.fn().mockResolvedValue([]),
  getSessionsCount: vi.fn().mockResolvedValue(0),
}));

const toastSpy = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastSpy,
  }),
}));

vi.mock('@/features/dashboard/hooks/use-progressive-export', () => ({
  useProgressiveExport: () => ({
    exportProgress: { isExporting: false, progress: 0, loadedCount: 0, totalCount: 0 },
    fetchAllSessionsWithProgress: vi.fn().mockResolvedValue([]),
    resetProgress: vi.fn(),
  }),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: { checked: boolean; onCheckedChange?: (value: boolean) => void; id?: string }) => (
    <button type="button" data-testid={id} onClick={() => onCheckedChange?.(!checked)}>
      {checked ? 'checked' : 'unchecked'}
    </button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockFilterSessions = vi.fn();
const mockFormatSessionsStandardJSON = vi.fn();
const mockFormatSessionsDetailedJSON = vi.fn();
const mockFormatSessionsStandard = vi.fn();
const mockFormatSessionsDetailed = vi.fn();
const mockGetStandardHeaders = vi.fn();
const mockGetDetailedHeaders = vi.fn();
const mockGenerateCSV = vi.fn();
const mockGenerateXLSX = vi.fn();
const mockGenerateJSON = vi.fn();
const mockDownloadFile = vi.fn();
const mockDownloadBlob = vi.fn();

vi.mock('@/lib/utils/export/session-export', () => ({
  filterSessions: (...args: unknown[]) => mockFilterSessions(...args),
  formatSessionsStandardJSON: (...args: unknown[]) => mockFormatSessionsStandardJSON(...args),
  formatSessionsDetailedJSON: (...args: unknown[]) => mockFormatSessionsDetailedJSON(...args),
  formatSessionsStandard: (...args: unknown[]) => mockFormatSessionsStandard(...args),
  formatSessionsDetailed: (...args: unknown[]) => mockFormatSessionsDetailed(...args),
  getStandardHeaders: (...args: unknown[]) => mockGetStandardHeaders(...args),
  getDetailedHeaders: (...args: unknown[]) => mockGetDetailedHeaders(...args),
  generateCSV: (...args: unknown[]) => mockGenerateCSV(...args),
  generateXLSX: (...args: unknown[]) => mockGenerateXLSX(...args),
  generateJSON: (...args: unknown[]) => mockGenerateJSON(...args),
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
  generateExportFilename: vi.fn(() => 'export.csv'),
}));

describe('ExportSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('shows planned checkbox when planned sessions exist', () => {
    const mockOnOpenChange = vi.fn();
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[{ id: 'p1', status: 'planned' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Inclure les séances planifiées')).toBeInTheDocument();
  });

  it('shows toast when filtered sessions are empty', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    mockFilterSessions.mockReturnValue([]);
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set(['1'])}
        allSessions={[{ id: '1', status: 'completed' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /JSON/i }));

    expect(toastSpy).toHaveBeenCalled();
  });

  it('exports standard JSON when intervals are disabled', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    mockFilterSessions.mockReturnValue([{ id: '1' }]);
    mockFormatSessionsStandardJSON.mockReturnValue([{ id: '1' }]);
    mockGenerateJSON.mockReturnValue('json-content');

    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[{ id: '1', status: 'completed' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByTestId('include-intervals'));
    await user.click(screen.getByRole('button', { name: /JSON/i }));

    expect(mockFormatSessionsStandardJSON).toHaveBeenCalled();
    expect(mockGenerateJSON).toHaveBeenCalled();
    expect(mockDownloadFile).toHaveBeenCalled();
  });

  it('exports standard CSV when intervals are disabled', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    mockFilterSessions.mockReturnValue([{ id: '1' }]);
    mockFormatSessionsStandard.mockReturnValue([['row1']]);
    mockGetStandardHeaders.mockReturnValue(['header1']);
    mockGenerateCSV.mockReturnValue('csv-content');

    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set(['1'])}
        allSessions={[{ id: '1', status: 'completed' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByTestId('include-intervals'));
    await user.click(screen.getByRole('button', { name: /CSV/i }));

    expect(mockFormatSessionsStandard).toHaveBeenCalled();
    expect(mockGetStandardHeaders).toHaveBeenCalled();
    expect(mockGenerateCSV).toHaveBeenCalled();
    expect(mockDownloadFile).toHaveBeenCalled();
  });

  it('exports standard XLSX when intervals are disabled', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    mockFilterSessions.mockReturnValue([{ id: '1' }]);
    mockFormatSessionsStandard.mockReturnValue([['row1']]);
    mockGetStandardHeaders.mockReturnValue(['header1']);
    const mockBlob = new Blob(['xlsx-content']);
    mockGenerateXLSX.mockResolvedValue(mockBlob);

    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set(['1'])}
        allSessions={[{ id: '1', status: 'completed' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByTestId('include-intervals'));
    await user.click(screen.getByRole('button', { name: /EXCEL/i }));

    await waitFor(() => {
      expect(mockFormatSessionsStandard).toHaveBeenCalled();
      expect(mockGetStandardHeaders).toHaveBeenCalled();
      expect(mockGenerateXLSX).toHaveBeenCalled();
      expect(mockDownloadBlob).toHaveBeenCalled();
    });
  });

  it('exports detailed JSON when intervals are enabled', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    mockFilterSessions.mockReturnValue([{ id: '1' }]);
    mockFormatSessionsDetailedJSON.mockReturnValue([{ id: '1', intervals: [] }]);
    mockGenerateJSON.mockReturnValue('json-content');

    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set(['1'])}
        allSessions={[{ id: '1', status: 'completed' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /JSON/i }));

    expect(mockFormatSessionsDetailedJSON).toHaveBeenCalled();
    expect(mockGenerateJSON).toHaveBeenCalled();
    expect(mockDownloadFile).toHaveBeenCalled();
  });

  it('exports detailed CSV when intervals are enabled', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    mockFilterSessions.mockReturnValue([{ id: '1' }]);
    mockFormatSessionsDetailed.mockReturnValue([['row1']]);
    mockGetDetailedHeaders.mockReturnValue(['header1']);
    mockGenerateCSV.mockReturnValue('csv-content');

    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set(['1'])}
        allSessions={[{ id: '1', status: 'completed' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /CSV/i }));

    expect(mockFormatSessionsDetailed).toHaveBeenCalled();
    expect(mockGetDetailedHeaders).toHaveBeenCalled();
    expect(mockGenerateCSV).toHaveBeenCalled();
    expect(mockDownloadFile).toHaveBeenCalled();
  });

  it('exports detailed XLSX when intervals are enabled', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    mockFilterSessions.mockReturnValue([{ id: '1' }]);
    mockFormatSessionsDetailed.mockReturnValue([['row1']]);
    mockGetDetailedHeaders.mockReturnValue(['header1']);
    const mockBlob = new Blob(['xlsx-content']);
    mockGenerateXLSX.mockResolvedValue(mockBlob);

    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set(['1'])}
        allSessions={[{ id: '1', status: 'completed' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /EXCEL/i }));

    await waitFor(() => {
      expect(mockFormatSessionsDetailed).toHaveBeenCalled();
      expect(mockGetDetailedHeaders).toHaveBeenCalled();
      expect(mockGenerateXLSX).toHaveBeenCalled();
      expect(mockDownloadBlob).toHaveBeenCalled();
    });
  });

  it('shows error toast when export fails', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    mockFilterSessions.mockImplementation(() => {
      throw new Error('Export failed');
    });

    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set(['1'])}
        allSessions={[{ id: '1', status: 'completed' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /JSON/i }));

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Erreur d'export",
        variant: 'destructive',
      })
    );
  });

  it('toggles include planned checkbox', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    render(
      <ExportSessions
        selectedType="all"
        selectedSessions={new Set()}
        allSessions={[{ id: 'p1', status: 'planned' } as never]}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const plannedCheckbox = screen.getByTestId('include-planned');
    expect(plannedCheckbox).toHaveTextContent('unchecked');

    await user.click(plannedCheckbox);
    expect(plannedCheckbox).toHaveTextContent('checked');
  });
});
