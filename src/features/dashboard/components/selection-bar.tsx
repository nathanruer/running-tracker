import { Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export function SelectionBar({ selectedCount, onClear, onDelete, onExport }: SelectionBarProps) {
  const exportLabel = selectedCount === 1 ? 'Exporter 1 séance' : 'Exporter la sélection';
  const deleteLabel = selectedCount === 1 ? 'Supprimer 1 séance' : 'Supprimer la sélection';

  return (
    <div className="mt-2 flex items-center justify-between rounded-md bg-muted/40 border border-border p-2 pl-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} séance{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}
        </span>
        <div className="h-4 w-[1px] bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          Annuler
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-8 px-3 text-xs hover:bg-muted hover:text-foreground"
          data-testid="bulk-export-button"
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          {exportLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="h-8 px-3 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/50 hover:border-destructive"
          data-testid="bulk-delete-button"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {deleteLabel}
        </Button>
      </div>
    </div>
  );
}
