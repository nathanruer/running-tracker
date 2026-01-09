import type { UseFormSetValue } from 'react-hook-form';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import { useFileInput } from '@/hooks/use-file-input';
import { parseIntervalCSV } from '@/lib/utils/parsers/interval-csv';
import type { FormValues } from '@/lib/validation/session-form';

interface UseFileImportProps {
  onValuesChange: UseFormSetValue<FormValues>;
  onIntervalModeChange: (mode: 'quick' | 'detailed') => void;
}

export function useFileImport({ onValuesChange, onIntervalModeChange }: UseFileImportProps) {
  const { handleError, handleSuccess } = useApiErrorHandler();
  const csvInput = useFileInput();

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseIntervalCSV(text);

      if (!result) {
        handleError(new Error('Impossible de lire le fichier CSV'));
        return;
      }

      onValuesChange('sessionType', 'Fractionné', { shouldDirty: true, shouldValidate: true });

      onValuesChange('steps', result.steps.map(step => ({
        ...step,
        duration: step.duration || null,
        distance: step.distance ?? null,
        pace: step.pace || null,
        hr: step.hr ?? null,
      })), { shouldDirty: true });

      onValuesChange('repetitionCount', result.repetitionCount || undefined, { shouldDirty: true });

      onIntervalModeChange('detailed');

      handleSuccess('Intervalles importés', `${result.repetitionCount} répétitions détectées depuis le CSV.`);

      csvInput.resetFileInput();
    } catch (error) {
      handleError(error, 'Une erreur est survenue lors de l\'import du fichier CSV');
    }
  };

  const triggerCsvSelect = () => {
    csvInput.triggerFileSelect();
  };

  return {
    csvFileInputRef: csvInput.fileInputRef,
    triggerCsvSelect,
    handleCSVImport,
  };
}
