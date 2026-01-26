import { Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export function SelectionBar({ selectedCount, onClear, onDelete, onExport }: SelectionBarProps) {
  return (
    <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl bg-muted/20 border border-border/40 p-3 sm:pl-6 animate-in fade-in zoom-in-95 duration-200 shadow-lg">
      <div className="flex items-center justify-between sm:justify-start gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-foreground">
            {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
          </span>
          <div className="h-4 w-[1px] bg-border/40" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-foreground hover:bg-transparent transition-all"
        >
          Annuler
        </Button>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button
          data-testid="btn-export-selected"
          onClick={onExport}
          variant="ghost"
          className="group rounded-2xl h-10 md:h-12 px-4 md:px-6 transition-all active:scale-95 flex items-center justify-center border border-border/40 bg-muted/10 hover:bg-muted/20 hover:border-border/60"
        >
          <Download className="h-4 w-4 md:mr-2 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="hidden md:inline text-[11px] font-bold uppercase tracking-widest leading-none text-muted-foreground group-hover:text-foreground transition-colors">Exporter ({selectedCount})</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="flex-1 sm:flex-initial h-10 md:h-12 px-4 md:px-6 rounded-2xl border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold text-[10px] md:text-[11px] uppercase tracking-wider active:scale-95 transition-all shadow-none"
          data-testid="bulk-delete-button"
        >
          <Trash2 className="mr-1.5 md:mr-2 h-3.5 w-3.5 opacity-70" />
          Supprimer ({selectedCount})
        </Button>
      </div>
    </div>
  );
}
