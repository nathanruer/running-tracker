import type { EndOfListProps } from './types';

export function EndOfList({
  visible,
  label = "Fin de l'historique",
}: EndOfListProps) {
  if (!visible) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 w-full group">
      <div className="h-px w-12 bg-border/20 group-hover:w-20 transition-all duration-700 mb-4" />
      <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
