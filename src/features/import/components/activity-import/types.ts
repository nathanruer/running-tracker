import type { QueryClient } from '@tanstack/react-query';
import type { ImportableActivity } from '@/lib/services/api-client';

export interface ActivityImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ImportableActivity) => void;
  mode?: 'create' | 'edit' | 'complete';
  queryClient?: QueryClient;
  onBulkImportSuccess?: () => void;
}

export interface ActivityImportContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ImportableActivity) => void;
  mode: 'create' | 'edit' | 'complete';
  queryClient?: QueryClient;
  onBulkImportSuccess?: () => void;
}

export interface ImportToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activitiesCount: number;
  totalCount: number | undefined;
  filteredCount: number;
  loading: boolean;
  hasMore: boolean;
  searchLoading: boolean;
  isLoadingAll: boolean;
  searchProgress: { loaded: number; total: number };
  onLoadAll: () => void;
  onCancelLoadAll: () => void;
}

export interface ImportTableHeaderProps {
  mode: 'create' | 'edit' | 'complete';
  hasActivities: boolean;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  importableCount: number;
  onToggleSelectAll: () => void;
  sortColumn: string | null;
  onSort: (column: string) => void;
  SortIcon: React.FC<{ column: string }>;
}

export interface ActivityRowProps {
  activity: ImportableActivity;
  index: number;
  selected: boolean;
  onToggleSelect: (index: number, e?: React.MouseEvent) => void;
  alreadyImported: boolean;
}

export interface ActivityTableProps {
  activities: ImportableActivity[];
  filteredActivities: ImportableActivity[];
  mode: 'create' | 'edit' | 'complete';
  isSelected: (index: number) => boolean;
  isAllSelected: () => boolean;
  isSomeSelected: () => boolean;
  importableCount: number;
  toggleSelectWithEvent: (index: number, event?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  toggleSelectAll: () => void;
  sortColumn: string | null;
  handleSort: (column: string) => void;
  SortIcon: React.FC<{ column: string }>;
  hasMore: boolean;
  loadingMore: boolean;
  observerTarget: React.RefObject<HTMLDivElement | null>;
  topRef: React.RefObject<HTMLTableSectionElement | null>;
  searchQuery: string;
  searchLoading: boolean;
  totalCount: number | undefined;
  totalLoadedCount: number;
  onSearchAll: () => void;
  importedKeys: Set<string>;
}

export interface SmartSearchEmptyStateProps {
  searchQuery: string;
  hasMore: boolean;
  searchLoading: boolean;
  loadedCount: number;
  totalCount: number | undefined;
  onSearchAll: () => void;
}

import type { ChunkedImportStatus } from '../../hooks/use-chunked-import';

export interface ImportFooterProps {
  selectedCount: number;
  status: ChunkedImportStatus;
  progress: { imported: number; skipped: number; total: number };
  onCancel: () => void;
  onImport: () => void;
  onCancelImport: () => void;
}

export interface ImportLoadingSkeletonProps {
  rows?: number;
}
