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
  searchProgress: { loaded: number; total: number };
  onLoadAll: () => void;
  onCancelSearch: () => void;
}

export interface StravaTableHeaderProps {
  mode: 'create' | 'edit' | 'complete';
  hasActivities: boolean;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  sortColumn: string | null;
  onSort: (column: string) => void;
  SortIcon: React.FC<{ column: string }>;
}

export interface StravaActivityRowProps {
  activity: FormattedStravaActivity;
  index: number;
  selected: boolean;
  onToggleSelect: (index: number) => void;
}

export interface StravaActivitiesTableProps {
  activities: FormattedStravaActivity[];
  filteredActivities: FormattedStravaActivity[];
  mode: 'create' | 'edit' | 'complete';
  selectedIndices: Set<number>;
  isSelected: (index: number) => boolean;
  isAllSelected: () => boolean;
  toggleSelect: (index: number) => void;
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
}

export interface SmartSearchEmptyStateProps {
  searchQuery: string;
  hasMore: boolean;
  searchLoading: boolean;
  loadedCount: number;
  totalCount: number | undefined;
  onSearchAll: () => void;
}

export interface StravaImportFooterProps {
  selectedCount: number;
  importing: boolean;
  onCancel: () => void;
  onImport: () => void;
}

export interface StravaLoadingSkeletonProps {
  rows?: number;
}
