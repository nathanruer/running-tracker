export interface ScopeIndicatorProps {
  loadedCount: number;
  totalCount: number | undefined;
  hasMore: boolean;
  searchLoading?: boolean;
  searchProgress?: { loaded: number; total: number };
  filteredCount?: number;
  searchQuery?: string;
  unit?: string;
  onLoadAll?: () => void;
  isLoadingAll?: boolean;
  onCancelLoadAll?: () => void;
  isFetching?: boolean;
  isFiltering?: boolean;
}

export interface LoadAllButtonProps {
  hasMore: boolean;
  loading: boolean;
  onLoadAll: () => void;
  onCancel: () => void;
}

export interface InfiniteScrollTriggerProps {
  hasMore: boolean;
  loading: boolean;
  observerRef: React.RefObject<HTMLDivElement | null>;
  skeleton?: React.ReactNode;
}

export interface EndOfListProps {
  visible: boolean;
  label?: string;
}
