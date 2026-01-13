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
    <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 rounded-md bg-muted/40 border border-border p-2 sm:pl-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between sm:justify-start gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} séance{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}
          </span>
          <div className="h-4 w-[1px] bg-border" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          Annuler
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="w-full sm:w-auto h-9 px-4 text-xs font-semibold text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground active:scale-95 transition-all rounded-xl"
          data-testid="bulk-export-button"
        >
          <Download className="mr-2 h-4 w-4" />
          {exportLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="w-full sm:w-auto h-9 px-4 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive hover:text-white transition-all rounded-xl"
          data-testid="bulk-delete-button"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteLabel}
        </Button>
      </div>
    </div>
  );
}
