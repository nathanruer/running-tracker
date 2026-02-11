import { FilterX, Plus, X } from 'lucide-react';
import { CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { ScopeIndicator } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectionBar } from './selection-bar';
import { PeriodFilter } from './period-filter';
import type { Period } from '../hooks/use-dashboard-filters';

const PERIOD_LABELS: Record<Period, string> = {
  all: 'Tout',
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
};

interface ActiveFilterChipProps {
  id: string;
  label: string;
  onRemove: () => void;
}

function ActiveFilterChip({ id, label, onRemove }: ActiveFilterChipProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-testid={`active-filter-${id}`}
      onClick={onRemove}
      className="h-8 px-2.5 rounded-full border border-border/40 bg-muted/10 text-[9px] md:text-[10px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-muted/20 transition-colors flex items-center gap-2"
      aria-label={`Retirer le filtre ${label}`}
    >
      <span className="max-w-[160px] truncate">{label}</span>
      <X className="h-3 w-3" />
    </Button>
  );
}

interface SessionsTableToolbarProps {
  totalCount: number;
  loadedCount: number;
  hasMore: boolean;
  isLoadingAll: boolean;
  onLoadAll: () => void;
  onCancelLoadAll: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  onOpenBulkDelete: () => void;
  onBulkEnrich?: () => void;
  enrichableCount?: number;
  isDeleting?: boolean;
  isEnriching?: boolean;
  actions: {
    onNewSession?: () => void;
  };
  selectedType: string;
  availableTypes: string[];
  onTypeChange: (type: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFetching?: boolean;
  period: Period;
  onPeriodChange: (period: Period) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function SessionsTableToolbar({
  totalCount,
  loadedCount,
  hasMore,
  isLoadingAll,
  onLoadAll,
  onCancelLoadAll,
  selectedCount,
  onClearSelection,
  onOpenBulkDelete,
  onBulkEnrich,
  enrichableCount,
  isDeleting,
  isEnriching,
  actions,
  selectedType,
  availableTypes,
  onTypeChange,
  searchQuery,
  onSearchChange,
  isFetching,
  period,
  onPeriodChange,
  hasActiveFilters,
  onClearFilters,
}: SessionsTableToolbarProps) {
  const trimmedSearch = searchQuery.trim();
  const activeFilters = [
    ...(selectedType !== 'all'
      ? [
          {
            id: 'type',
            label: `Type: ${selectedType}`,
            onRemove: () => onTypeChange('all'),
          },
        ]
      : []),
    ...(period !== 'all'
      ? [
          {
            id: 'period',
            label: `Période: ${PERIOD_LABELS[period]}`,
            onRemove: () => onPeriodChange('all'),
          },
        ]
      : []),
    ...(trimmedSearch
      ? [
          {
            id: 'search',
            label: `Recherche: ${trimmedSearch}`,
            onRemove: () => onSearchChange(''),
          },
        ]
      : []),
  ];

  return (
    <CardHeader className="flex flex-col gap-4 px-3 py-4 md:px-8 md:py-8 border-b border-border/40">
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between gap-1 md:gap-4">
          <div className="flex items-center gap-1.5 md:gap-4 min-w-0 flex-1">
            <h2 className="text-base md:text-2xl font-black tracking-tight truncate shrink-0">
              Historique
            </h2>

            <div className="min-w-0 flex-shrink">
              <ScopeIndicator
                loadedCount={loadedCount}
                totalCount={totalCount}
                hasMore={hasMore}
                searchQuery={searchQuery}
                unit="séances"
                onLoadAll={onLoadAll}
                isLoadingAll={isLoadingAll}
                onCancelLoadAll={onCancelLoadAll}
                isFetching={isFetching}
                isFiltering={hasActiveFilters}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 shrink-0 ml-1">
            {actions.onNewSession && (
              <Button
                data-testid="btn-new-session"
                onClick={actions.onNewSession}
                variant="action"
                size="sm"
                className="rounded-xl h-9 w-9 md:h-12 md:w-auto md:px-8 transition-all active:scale-95 flex items-center justify-center border border-violet-400/20 shadow-none shrink-0"
                title="Nouvelle séance"
              >
                <Plus className="h-4 w-4 md:h-4 md:w-4" />
                <span className="hidden md:inline text-[11px] font-bold uppercase tracking-widest leading-none ml-2">Nouvelle séance</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 md:gap-4">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full xl:w-[320px]"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedType} onValueChange={onTypeChange}>
              <SelectTrigger data-testid="filter-session-type" className="w-auto min-w-[120px] max-w-[150px] md:w-[160px] h-9 md:h-10 rounded-xl bg-muted/5 border-border/40 font-bold text-[9px] md:text-[11px] uppercase tracking-wider hover:bg-muted/10 transition-colors">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                <SelectItem value="all">Tous les types</SelectItem>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <PeriodFilter period={period} onPeriodChange={onPeriodChange} />
          </div>
        </div>
      </div>

      {hasActiveFilters && activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <ActiveFilterChip
              key={filter.id}
              id={filter.id}
              label={filter.label}
              onRemove={filter.onRemove}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2.5 rounded-full text-violet-600 hover:text-violet-700 hover:bg-violet-600/5 font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5"
          >
            <FilterX className="h-3.5 w-3.5" />
            <span>Tout effacer</span>
          </Button>
        </div>
      )}

      {selectedCount > 0 && (
        <SelectionBar
          selectedCount={selectedCount}
          onClear={onClearSelection}
          onDelete={onOpenBulkDelete}
          isDeleting={isDeleting}
          onEnrich={onBulkEnrich}
          isEnriching={isEnriching}
          enrichCount={enrichableCount}
        />
      )}
    </CardHeader>
  );
}
