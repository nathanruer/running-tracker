import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SmartSearchEmptyStateProps } from './types';

export function SmartSearchEmptyState({
  searchQuery,
  hasMore,
  searchLoading,
  loadedCount,
  totalCount,
  onSearchAll,
}: SmartSearchEmptyStateProps) {
  if (searchLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="relative">
          <Search className="h-12 w-12 text-muted-foreground/20" />
          <Loader2 className="absolute -right-1 -bottom-1 h-5 w-5 text-violet-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Recherche de &quot;{searchQuery}&quot;...
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {loadedCount} / {totalCount || '?'} activités analysées
          </p>
        </div>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Search className="h-12 w-12 text-muted-foreground/20" />
        <p className="text-sm font-medium text-muted-foreground">
          Aucune activité trouvée pour &quot;{searchQuery}&quot;
        </p>
        <p className="text-xs text-muted-foreground/50">
          Toutes les {loadedCount} activités ont été analysées
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Search className="h-12 w-12 text-muted-foreground/20" />
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Aucun résultat dans les {loadedCount} activités chargées
        </p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          {totalCount
            ? `${totalCount - loadedCount} activités restantes`
            : "Plus d'activités disponibles"}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onSearchAll} className="mt-2">
        <Search className="mr-2 h-4 w-4" />
        Rechercher dans toutes les activités
      </Button>
    </div>
  );
}
