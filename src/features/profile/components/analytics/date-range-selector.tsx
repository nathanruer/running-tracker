import { BarChart3, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import type { ChartGranularity, DateRangeType } from '@/lib/domain/analytics/date-range';
import { formatDateToISO } from '@/lib/utils/date';

interface DateRangeSelectorProps {
  dateRange: DateRangeType;
  onDateRangeChange: (value: DateRangeType) => void;
  granularity: ChartGranularity;
  onGranularityChange: (value: ChartGranularity) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
  customDateError?: string;
  rangeLabel: string;
}

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  granularity,
  onGranularityChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  customDateError,
  rangeLabel,
}: DateRangeSelectorProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap items-center gap-0.5 p-1 rounded-2xl bg-muted/10 border border-border/40 backdrop-blur-xl shadow-xl w-full sm:w-fit">
        <Select value={dateRange} onValueChange={(value) => onDateRangeChange(value as DateRangeType)}>
          <SelectTrigger 
            data-testid="select-date-range" 
            className="h-9 md:h-10 px-4 border-none bg-transparent hover:bg-muted/10 data-[state=open]:bg-muted/10 rounded-xl shadow-none focus:ring-0 w-fit min-w-[140px] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all gap-2"
          >
            <Calendar className="h-4 w-4 text-muted-foreground/60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40 rounded-2xl shadow-2xl">
            <SelectItem value="4weeks" className="rounded-xl">4 dernières semaines</SelectItem>
            <SelectItem value="8weeks" className="rounded-xl">8 dernières semaines</SelectItem>
            <SelectItem value="12weeks" className="rounded-xl">12 dernières semaines</SelectItem>
            <SelectItem value="all" className="rounded-xl">Tout l&apos;historique</SelectItem>
            <SelectItem value="custom" className="rounded-xl">Période personnalisée</SelectItem>
          </SelectContent>
        </Select>

        <div className="hidden sm:block w-px h-4 bg-border/20 mx-1" />

        <Select value={granularity} onValueChange={(value) => onGranularityChange(value as ChartGranularity)}>
          <SelectTrigger 
            data-testid="select-granularity" 
            className="h-9 md:h-10 px-4 border-none bg-transparent hover:bg-muted/10 data-[state=open]:bg-muted/10 rounded-xl shadow-none focus:ring-0 w-fit min-w-[110px] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all gap-2"
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40 rounded-2xl shadow-2xl">
            <SelectItem value="day" className="rounded-xl">Jour</SelectItem>
            <SelectItem value="week" className="rounded-xl">Semaine</SelectItem>
            <SelectItem value="month" className="rounded-xl">Mois</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="hidden sm:block w-px h-4 bg-border/20 mx-1" />
            <div className="flex items-center gap-1.5 p-1">
                <DatePicker
                variant="ghost"
                date={customStartDate ? new Date(customStartDate + 'T00:00:00') : undefined}
                onSelect={(date: Date | undefined) => onCustomStartDateChange(date ? formatDateToISO(date) : '')}
                placeholder="Début"
                className="h-7 md:h-8 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider w-[85px] md:w-[100px] transition-all px-2 hover:bg-muted/10 border-none shadow-none"
              />
              <span className="text-[10px] text-muted-foreground/30 font-black">→</span>
                <DatePicker
                variant="ghost"
                date={customEndDate ? new Date(customEndDate + 'T00:00:00') : undefined}
                onSelect={(date: Date | undefined) => onCustomEndDateChange(date ? formatDateToISO(date) : '')}
                placeholder="Fin"
                className="h-7 md:h-8 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider w-[85px] md:w-[100px] transition-all px-2 hover:bg-muted/10 border-none shadow-none"
              />
            </div>

            {customDateError && (
              <div data-testid="custom-date-error" className="text-[8px] font-black text-red-400 uppercase tracking-tighter bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20 whitespace-nowrap">
                {customDateError}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-2 text-[11px] font-semibold text-muted-foreground/70">
        <span data-testid="range-label" className="tracking-tight">{rangeLabel}</span>
      </div>
    </div>
  );
}
