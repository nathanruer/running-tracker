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
      "flex flex-col p-4 rounded-xl border transition-colors",
      highlight
        ? "bg-primary/5 border-primary/20"
        : "bg-muted/30 border-border/50"
    )}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
