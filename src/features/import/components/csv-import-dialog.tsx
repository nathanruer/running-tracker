'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseTrainingFile } from '@/lib/utils/parsers/csv';
import { useTableSort } from '@/hooks/use-table-sort';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import type { ParsedSession } from '@/lib/types/parser';
import { CsvFileUploadSection } from './csv-file-upload-section';
import { CsvPreviewActions } from './csv-preview-actions';
import { CsvPreviewTable } from './csv-preview-table';
import { CsvImportActions } from './csv-import-actions';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (sessions: ParsedSession[]) => Promise<void>;
  onCancel?: () => void;
  isImporting?: boolean;
  mode?: 'create' | 'edit' | 'complete';
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImport,
  onCancel,
  isImporting = false,
  mode = 'create',
}: CsvImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedSession[]>([]);
  const [error, setError] = useState<string>('');

  const { handleWarning } = useApiErrorHandler();
  const { handleSort, sortColumn, sortDirection, defaultComparator } =
    useTableSort<ParsedSession>(preview, null, 'desc');
  const {
    selectedIndices,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  } = useTableSelection(preview, mode === 'complete' ? 'single' : 'multiple');

  useEffect(() => {
    if (preview.length > 0 && selectedIndices.size === 0) {
      toggleSelectAll();
    }
  }, [preview.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setPreview([]);

    const result = await parseTrainingFile(file);

    if (result.error) {
      setError(result.error);
    } else {
      setPreview(result.sessions);
    }

    setLoading(false);
    event.target.value = '';
  };

  const handleImport = async () => {
    const selectedSessions = preview.filter((_, i) => selectedIndices.has(i));

    if (selectedSessions.length === 0) {
      handleWarning('Veuillez sélectionner au moins une séance à importer.');
      return;
    }

    await onImport(selectedSessions);

    setPreview([]);
    clearSelection();
  };

  const sortedPreview = defaultComparator((session: ParsedSession, column: string) => {
    switch (column) {
      case 'date':
        return new Date(session.date);
      case 'sessionType':
        return session.sessionType.toLowerCase();
      case 'duration':
        return session.duration;
      case 'distance':
        return session.distance;
      case 'avgPace':
        const [min, sec] = session.avgPace.split(':').map(Number);
        return (min || 0) * 60 + (sec || 0);
      case 'avgHeartRate':
        return session.avgHeartRate;
      case 'perceivedExertion':
        return session.perceivedExertion || 0;
      default:
        return '';
    }
  });

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val && onCancel) onCancel();
    }}>
      <DialogContent className={`max-h-xl overflow-hidden ${preview.length === 0 ? 'sm:max-w-2xl' : 'sm:max-w-6xl'}`}>
        <DialogHeader>
          <DialogTitle>Importer des séances (CSV ou JSON)</DialogTitle>
          <DialogDescription>
            {mode === 'complete'
              ? "Importez les données d'une séance depuis un fichier CSV ou JSON"
              : 'Importez plusieurs séances en une seule fois depuis un fichier CSV, Excel (exporté en CSV) ou JSON'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {preview.length === 0 ? (
            <CsvFileUploadSection loading={loading} onFileSelect={handleFileUpload} />
          ) : (
            <>
              <CsvPreviewActions
                sessionCount={preview.length}
                selectedCount={selectedIndices.size}
                mode={mode}
                onToggleSelectAll={toggleSelectAll}
                onChangeFile={handleFileUpload}
              />

              <CsvPreviewTable
                preview={sortedPreview}
                selectedIndices={selectedIndices}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                mode={mode}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onSort={handleSort}
              />

              <CsvImportActions
                isImporting={isImporting}
                selectedCount={selectedIndices.size}
                onCancel={() => {
                  setPreview([]);
                  setError('');
                }}
                onImport={handleImport}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
