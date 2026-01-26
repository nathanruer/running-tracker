import { SearchInput } from '@/components/ui/search-input';
import type { StravaToolbarProps } from './types';

export function StravaToolbar({
  searchQuery,
  onSearchChange,
  activitiesCount,
  loading,
}: StravaToolbarProps) {
  return (
    <div className="px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-border/10">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Filtrer par nom..."
        className="md:w-[320px]"
      />
      <div className="flex items-center ml-auto">
        <div className="flex items-center bg-muted/5 border border-border/40 rounded-xl px-3 py-1.5 transition-all">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/30 whitespace-nowrap">
            {loading ? '...' : `${activitiesCount} activités`}
          </span>
        </div>
      </div>
    </div>
  );
}
