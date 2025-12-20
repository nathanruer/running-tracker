import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

interface DateRangeInputsProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartChange: (date: Date | undefined) => void;
  onEndChange: (date: Date | undefined) => void;
}

export function DateRangeInputs({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: DateRangeInputsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Date de début</Label>
        <DatePicker date={startDate} onSelect={onStartChange} />
      </div>
      <div className="space-y-2">
        <Label>Date de fin</Label>
        <DatePicker date={endDate} onSelect={onEndChange} />
      </div>
    </div>
  );
}
