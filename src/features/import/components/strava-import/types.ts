import type { QueryClient } from '@tanstack/react-query';
import type { FormattedStravaActivity } from '@/lib/services/api-client';

export interface StravaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: FormattedStravaActivity) => void;
  mode?: 'create' | 'edit' | 'complete';
  queryClient?: QueryClient;
  onBulkImportSuccess?: () => void;
}

export interface StravaImportContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: FormattedStravaActivity) => void;
  mode: 'create' | 'edit' | 'complete';
  queryClient?: QueryClient;
  onBulkImportSuccess?: () => void;
}

export interface StravaConnectScreenProps {
  loading: boolean;
  onConnect: () => void;
}

export interface StravaToolbarProps {
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

export interface StravaTableHeaderProps {
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

export interface StravaActivityRowProps {
  activity: FormattedStravaActivity;
  index: number;
  selected: boolean;
  onToggleSelect: (index: number, e?: React.MouseEvent) => void;
  alreadyImported: boolean;
}

export interface StravaActivitiesTableProps {
  activities: FormattedStravaActivity[];
  filteredActivities: FormattedStravaActivity[];
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

export interface StravaImportFooterProps {
  selectedCount: number;
  status: ChunkedImportStatus;
  progress: { imported: number; skipped: number; total: number };
  onCancel: () => void;
  onImport: () => void;
  onCancelImport: () => void;
}

export interface StravaLoadingSkeletonProps {
  rows?: number;
}
