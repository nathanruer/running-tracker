import { cn } from '@/lib/utils';
import { TableCell } from '@/components/ui/table';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface CellProps {
  className?: string;
}

interface MetricCellProps extends CellProps {
  value: string;
  unit?: string;
  isPlanned?: boolean;
  showApprox?: boolean;
  emptyValue?: string;
}

/**
 * Metric cell with optional unit and approximation indicator
 */
export function MetricCell({ 
  value, 
  unit, 
  isPlanned = false,
  showApprox = false,
  emptyValue = '-',
  className 
}: MetricCellProps) {
  if (value === '-' || value === emptyValue) {
    return (
      <TableCell className={cn("px-2 md:px-4 text-center whitespace-nowrap", className)}>
        <span className="text-muted-foreground/10">{emptyValue}</span>
      </TableCell>
    );
  }

  const textColor = isPlanned ? 'text-muted-foreground/30' : 'text-foreground/100';
  const unitColor = isPlanned ? 'text-muted-foreground/30' : 'text-muted-foreground/40';

  return (
    <TableCell className={cn("px-2 md:px-4 text-center whitespace-nowrap", className)}>
      <div className="flex items-baseline justify-center">
        <div className="relative inline-flex items-baseline group/metric">
          {showApprox && (
            <span className={cn(
              "absolute right-full mr-0.5 font-bold text-[10px] md:text-sm",
              isPlanned ? "text-muted-foreground/20" : "text-muted-foreground/40"
            )}>~</span>
          )}
          <span className={cn(
            "font-medium tabular-nums text-sm md:text-[15px] tracking-tight",
            textColor
          )}>
            {value}
          </span>
          {unit && (
            <span className={cn(
              "ml-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-widest",
              unitColor
            )}>
              {unit}
            </span>
          )}
        </div>
      </div>
    </TableCell>
  );
}

interface CheckboxCellProps extends CellProps {
  showCheckbox: boolean;
  isSelected: boolean;
  onToggleSelect?: () => void;
  sessionNumber: number;
}

/**
 * Checkbox cell for row selection
 */
export function CheckboxCell({
  showCheckbox,
  isSelected,
  onToggleSelect,
  sessionNumber,
  className,
}: CheckboxCellProps) {
  return (
    <TableCell 
      className={cn("w-10 md:w-12 px-2 md:px-6", className)} 
      onClick={(e) => e.stopPropagation()}
    >
      {showCheckbox && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className={cn(
            "transition-all duration-300",
            isSelected 
              ? "border-violet-500/50 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500" 
              : "border-muted-foreground/30 data-[state=checked]:bg-muted-foreground/40 data-[state=checked]:border-muted-foreground/40"
          )}
          aria-label={`Sélectionner la séance ${sessionNumber}`}
        />
      )}
    </TableCell>
  );
}

interface SessionTypeCellProps extends CellProps {
  sessionType: string;
  hasIntervalDetails: boolean;
  isOpen: boolean;
  isPlanned: boolean;
  workoutTypeLabel: string | null;
  intervalStructure: string | null;
}

/**
 * Session type cell with interval chevron and workout type label
 */
export function SessionTypeCell({
  sessionType,
  hasIntervalDetails,
  isOpen,
  isPlanned,
  workoutTypeLabel,
  intervalStructure,
  className,
}: SessionTypeCellProps) {
  const titleColor = isPlanned ? 'text-muted-foreground/30' : 'text-foreground/90';
  const chevronColor = isPlanned 
    ? 'text-muted-foreground/20 group-hover/title:text-muted-foreground/30' 
    : 'text-muted-foreground/40 group-hover/title:text-foreground/60';
  const labelColor = isPlanned ? 'text-muted-foreground/30' : 'text-primary/90';

  return (
    <TableCell className={cn("text-center whitespace-nowrap px-2 md:px-4", className)}>
      <div className="flex flex-col gap-0.5 items-center">
        <div className="flex items-center gap-1.5 group/title">
          <span className={cn(
            "font-semibold tracking-tighter uppercase text-[11px] md:text-[13px]",
            titleColor
          )}>
            {sessionType}
          </span>
          {hasIntervalDetails && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-all duration-300",
                chevronColor,
                isOpen ? 'rotate-180' : ''
              )}
            />
          )}
        </div>
        {(workoutTypeLabel || intervalStructure) && (
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-widest",
            isPlanned ? 'font-bold' : 'font-black',
            labelColor
          )}>
            {workoutTypeLabel || intervalStructure}
          </span>
        )}
      </div>
    </TableCell>
  );
}

interface DateCellProps extends CellProps {
  dateDisplay: string | null;
  isPlanned: boolean;
}

/**
 * Date cell with "À planifier" placeholder for planned sessions
 */
export function DateCell({ dateDisplay, isPlanned, className }: DateCellProps) {
  return (
    <TableCell className={cn(
      "px-2 md:px-4 text-center font-medium whitespace-nowrap",
      className
    )}>
      {dateDisplay ? (
        <span className={cn(
          "text-[11px] md:text-[13px] tracking-tight tabular-nums",
          isPlanned ? "text-muted-foreground/30" : "text-muted-foreground/40"
        )}>
          {dateDisplay}
        </span>
      ) : (
        isPlanned ? (
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/30">
            À planifier
          </span>
        ) : (
          <span className="text-muted-foreground/10 text-[13px]">-</span>
        )
      )}
    </TableCell>
  );
}

interface RPECellProps extends CellProps {
  rpe: number | null;
  rpeColor: string;
}

/**
 * RPE/Perceived Exertion cell with color coding
 */
export function RPECell({ rpe, rpeColor, className }: RPECellProps) {
  if (!rpe) {
    return (
      <TableCell className={cn("text-center whitespace-nowrap", className)}>
        <span className="text-muted-foreground/10">-</span>
      </TableCell>
    );
  }

  return (
    <TableCell className={cn("px-2 md:px-4 text-center whitespace-nowrap", className)}>
      <div className="flex items-baseline justify-center">
        <span className={cn("text-sm md:text-[15px] font-semibold tracking-tight", rpeColor)}>
          {rpe}
        </span>
        <span className="ml-0.5 text-[8px] md:text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
          /10
        </span>
      </div>
    </TableCell>
  );
}
