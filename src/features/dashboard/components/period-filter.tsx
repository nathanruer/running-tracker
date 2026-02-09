'use client';

import { cn } from '@/lib/utils';
import type { Period } from '../hooks/use-dashboard-filters';

interface PeriodFilterProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

export function PeriodFilter({ period, onPeriodChange }: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/5 rounded-xl border border-border/40 w-fit shrink-0 overflow-x-auto no-scrollbar">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          data-testid={`period-btn-${option.value}`}
          onClick={() => onPeriodChange(option.value)}
          className={cn(
            'px-2.5 md:px-4 py-1.5 rounded-lg text-[8px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
            period === option.value
              ? 'bg-violet-600 text-white active:scale-95'
              : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/20'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
