import { FilterX, Download, FileUp, Plus } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectionBar } from './selection-bar';
import { PeriodFilter } from './period-filter';
import type { Period } from '../hooks/use-period-filter';

interface SessionsTableToolbarProps {
  initialLoading: boolean;
  totalCount: number;
  selectedCount: number;
  onClearSelection: () => void;
  onOpenBulkDelete: () => void;
  onOpenExport: () => void;
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
  initialLoading,
  totalCount,
  selectedCount,
  onClearSelection,
  onOpenBulkDelete,
  onOpenExport,
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
  return (
    <CardHeader className="flex flex-col gap-4 px-3 py-4 md:px-8 md:py-8 border-b border-border/40">
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <CardTitle className="text-lg md:text-2xl font-black tracking-tight truncate">
              Historique
            </CardTitle>
            {!initialLoading && (
              <div className="flex-shrink-0 px-2 py-0.5 rounded-full bg-violet-600/10 border border-violet-600/20 text-violet-600 font-black text-[9px] md:text-xs uppercase tracking-wider">
                {totalCount}
              </div>
            )}
          </div>

          {!initialLoading && (
            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
              {actions.onNewSession && (
                <Button
                  data-testid="btn-new-session"
                  onClick={actions.onNewSession}
                  variant="action"
                  size="sm"
                  className="group rounded-xl w-auto h-9 md:h-12 px-3 md:px-8 transition-all active:scale-95 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 md:h-4 md:w-4 shrink-0 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110 md:mr-2" />
                  <span className="hidden sm:inline text-[10px] md:text-[11px] font-bold uppercase tracking-widest leading-none">Nouvelle séance</span>
                  <span className="sm:hidden text-[9px] font-bold uppercase tracking-widest leading-none ml-1">Ajouter</span>
                </Button>
              )}

              {selectedCount === 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 md:h-12 md:w-12 rounded-xl border border-border/40 bg-muted/5 hover:bg-muted/10 shrink-0"
                      title="Actions de données"
                    >
                      <Download className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Données</DropdownMenuLabel>
                    <DropdownMenuItem onClick={onOpenExport}>
                      <Download className="h-4 w-4" />
                      Exporter
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <FileUp className="h-4 w-4" />
                      Importer (Bientôt)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full xl:w-[320px]"
            isLoading={isFetching}
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

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-9 px-2.5 rounded-xl text-violet-600 hover:text-violet-700 hover:bg-violet-600/5 font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 ml-auto sm:ml-0"
              >
                <FilterX className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Effacer</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <SelectionBar
          selectedCount={selectedCount}
          onClear={onClearSelection}
          onDelete={onOpenBulkDelete}
          onExport={onOpenExport}
        />
      )}
    </CardHeader>
  );
}
