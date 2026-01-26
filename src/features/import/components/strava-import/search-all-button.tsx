import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SearchAllButtonProps } from './types';

export function SearchAllButton({
  hasMore,
  searchLoading,
  onLoadAll,
  onCancel,
}: SearchAllButtonProps) {
  if (!hasMore && !searchLoading) {
    return null;
  }

  if (searchLoading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="h-8 px-3 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        <X className="mr-1.5 h-3.5 w-3.5" />
        Annuler
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onLoadAll}
      className="h-8 px-3 text-xs font-bold text-muted-foreground hover:text-foreground"
    >
      <Search className="mr-1.5 h-3.5 w-3.5" />
      Tout charger
    </Button>
  );
}
