import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, unit, highlight }: StatCardProps) {
  return (
    <div className={cn(
      "relative flex flex-col p-4 rounded-2xl transition-all duration-300",
      highlight
        ? "bg-primary/[0.08] dark:bg-primary/[0.12] ring-1 ring-primary/20"
        : "bg-muted/40 dark:bg-white/[0.03] border border-border/40"
    )}>
      <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] mb-1.5 leading-none">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black tracking-tight tabular-nums text-foreground/90 leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
