'use client';

import { cn } from '@/lib/utils';
import type { Period } from '../hooks/use-period-filter';

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
    <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-xl border border-border/40">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onPeriodChange(option.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-all',
            period === option.value
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/30'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
