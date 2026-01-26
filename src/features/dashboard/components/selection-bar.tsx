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
    <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl bg-violet-600/5 border border-violet-600/20 p-3 md:pl-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between md:justify-start gap-4">
        <div className="flex items-center gap-4">
          <div 
            data-testid="selection-count"
            className="flex items-center justify-center h-6 px-2.5 rounded-full bg-violet-600 text-white text-[10px] font-black"
          >
            {selectedCount}
          </div>
          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-foreground/80">
            Sélectionnée{selectedCount > 1 ? 's' : ''}
          </span>
          <div className="hidden md:block h-4 w-[1px] bg-violet-600/20" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 hover:text-violet-700 hover:bg-violet-600/5 transition-all"
        >
          Annuler
        </Button>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button
          data-testid="btn-export-selected"
          onClick={onExport}
          variant="ghost"
          className="flex-1 md:flex-initial group rounded-xl h-9 md:h-11 px-4 md:px-6 transition-all active:scale-95 flex items-center justify-center border border-border/40 bg-card hover:bg-muted/10 hover:border-border/60"
        >
          <Download className="h-4 w-4 md:mr-2 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest leading-none text-muted-foreground group-hover:text-foreground transition-colors">Exporter ({selectedCount})</span>
          <span className="md:hidden text-[10px] font-bold uppercase tracking-widest leading-none ml-2">Exporter ({selectedCount})</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="flex-1 md:flex-initial h-9 md:h-11 px-4 md:px-6 rounded-xl border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold text-[10px] md:text-[11px] uppercase tracking-wider active:scale-95 transition-all shadow-none"
          data-testid="bulk-delete-button"
        >
          <Trash2 className="mr-1.5 md:mr-2 h-3.5 w-3.5 opacity-70" />
          Supprimer ({selectedCount})
        </Button>
      </div>
    </div>
  );
}
