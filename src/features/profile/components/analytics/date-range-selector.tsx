import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

interface DateRangeSelectorProps {
  dateRange: '2weeks' | '4weeks' | '12weeks' | 'all' | 'custom';
  onDateRangeChange: (value: '2weeks' | '4weeks' | '12weeks' | 'all' | 'custom') => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
  customDateError?: string;
}

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  customDateError,
}: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 w-fit">
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger data-testid="select-date-range" className="h-8 px-2 border-none bg-transparent hover:bg-white/5 data-[state=open]:bg-white/5 rounded-xl shadow-none focus:ring-0 w-[110px] sm:w-[140px] text-[10px] sm:text-[11px] font-bold transition-all">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card/95 backdrop-blur-xl border-border/40 rounded-2xl shadow-2xl">
          <SelectItem value="4weeks" className="rounded-xl">4 dernières semaines</SelectItem>
          <SelectItem value="12weeks" className="rounded-xl">12 dernières semaines</SelectItem>
          <SelectItem value="all" className="rounded-xl">Toute la période</SelectItem>
          <SelectItem value="custom" className="rounded-xl">Personnalisé</SelectItem>
        </SelectContent>
      </Select>

      {dateRange === 'custom' && (
        <div className="flex items-center animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="hidden sm:block w-px h-3 bg-border/20 mx-1" />
          <div className="flex items-center gap-1">
            <DatePicker
              variant="ghost"
              date={customStartDate ? new Date(customStartDate + 'T00:00:00') : undefined}
              onSelect={(date: Date | undefined) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  onCustomStartDateChange(`${year}-${month}-${day}`);
                } else {
                  onCustomStartDateChange('');
                }
              }}
              placeholder="Début"
              className="h-7 rounded-lg text-[10px] font-bold w-[95px] sm:w-[110px] transition-all px-1.5"
            />
            <span className="text-[10px] text-muted-foreground/20 font-black">→</span>
            <DatePicker
              variant="ghost"
              date={customEndDate ? new Date(customEndDate + 'T00:00:00') : undefined}
              onSelect={(date: Date | undefined) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  onCustomEndDateChange(`${year}-${month}-${day}`);
                } else {
                  onCustomEndDateChange('');
                }
              }}
              placeholder="Fin"
              className="h-7 rounded-lg text-[10px] font-bold w-[95px] sm:w-[110px] transition-all px-1.5"
            />
          </div>

          {customDateError && (
            <div data-testid="custom-date-error" className="ml-1 text-[8px] font-black text-red-500 uppercase tracking-tighter bg-red-500/10 px-1 py-0.5 rounded-lg border border-red-500/20 whitespace-nowrap">
              {customDateError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
