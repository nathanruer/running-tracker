import { Button } from '@/components/ui/button';

interface CsvPreviewActionsProps {
  sessionCount: number;
  selectedCount: number;
  mode?: 'create' | 'edit' | 'complete';
  onToggleSelectAll: () => void;
  onChangeFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CsvPreviewActions({
  sessionCount,
  selectedCount,
  mode,
  onToggleSelectAll,
  onChangeFile,
}: CsvPreviewActionsProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">{sessionCount} séance(s) détectée(s)</p>
      <div className="flex gap-2">
        {mode !== 'complete' && (
          <Button variant="ghost" size="sm" onClick={onToggleSelectAll}>
            {selectedCount === sessionCount ? 'Tout désélectionner' : 'Tout sélectionner'}
          </Button>
        )}
        <label htmlFor="csv-upload-replace">
          <Button variant="outline" size="sm" asChild>
            <span>Changer de fichier</span>
          </Button>
        </label>
        <input
          id="csv-upload-replace"
          type="file"
          accept=".csv,.txt,.json"
          onChange={onChangeFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
