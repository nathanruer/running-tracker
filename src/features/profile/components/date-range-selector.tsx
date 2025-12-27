import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
    <div className="flex flex-col gap-4">
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="4weeks">4 dernières semaines</SelectItem>
          <SelectItem value="12weeks">12 dernières semaines</SelectItem>
          <SelectItem value="all">Toutes les données</SelectItem>
          <SelectItem value="custom">Personnalisé</SelectItem>
        </SelectContent>
      </Select>

      {dateRange === 'custom' && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Date de début
              </Label>
              <DatePicker
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
                placeholder="Sélectionner la date de début"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="end-date" className="text-sm font-medium">
                Date de fin
              </Label>
              <DatePicker
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
                placeholder="Sélectionner la date de fin"
              />
            </div>
          </div>

          {customDateError && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3">
              {customDateError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
