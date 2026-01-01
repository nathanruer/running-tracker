import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
}

export function SelectionBar({ selectedCount, onClear, onDelete }: SelectionBarProps) {
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
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        className="h-8 px-3 text-xs"
        data-testid="bulk-delete-button"
      >
        <Trash2 className="mr-2 h-3.5 w-3.5" />
        Supprimer
      </Button>
    </div>
  );
}
