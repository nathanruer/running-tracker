import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Activity } from 'lucide-react';
import type { BucketChartDataPoint } from '@/lib/domain/analytics/weekly-calculator';
import type { ChartGranularity } from '@/lib/domain/analytics/date-range';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/duration/format';

export type TooltipContentProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: BucketChartDataPoint }>;
  label?: string | number;
  granularity: ChartGranularity;
  coordinate?: { x: number; y: number };
  containerEl: HTMLDivElement | null;
};

type MetricSummaryProps = {
  title: string;
  value: ReactNode;
  unit?: string;
  changePercent: number | null;
  align?: 'left' | 'right';
  valueClassName?: string;
  unitClassName?: string;
};

type ProjectionVariant = 'realized' | 'projected';

const PROJECTION_STYLES: Record<ProjectionVariant, {
  label: string;
  container: string;
  dot: string;
  labelClassName: string;
  kmUnitClassName: string;
  durationClassName: string;
}> = {
  realized: {
    label: 'Réalisé',
    container: 'bg-white/5 border border-white/5',
    dot: 'bg-muted-foreground/30',
    labelClassName: 'text-muted-foreground/40',
    kmUnitClassName: 'text-[9px] font-bold text-muted-foreground/20 uppercase',
    durationClassName: 'text-[10px] font-bold text-muted-foreground/40 tabular-nums',
  },
  projected: {
    label: 'Projeté',
    container: 'bg-violet-500/10 border border-violet-500/10',
    dot: 'bg-violet-500',
    labelClassName: 'text-violet-500/70',
    kmUnitClassName: 'text-[9px] font-bold text-muted-foreground/20 uppercase',
    durationClassName: 'text-[10px] font-bold text-foreground/70 tabular-nums',
  },
};

function ChangeIndicator({
  value,
  className,
  labelClassName,
  align = 'left',
}: {
  value: number | null;
  className?: string;
  labelClassName?: string;
  align?: 'left' | 'right';
}) {
  if (value === null) return null;
  const isPositive = value >= 0;
  return (
    <div
      className={cn(
        'flex items-center gap-1 font-bold',
        align === 'right' && 'justify-end',
        isPositive ? 'text-emerald-500' : 'text-rose-500',
        'text-[8px] sm:text-[9px]',
        className
      )}
    >
      <span>{isPositive ? '↑' : '↓'} {Math.abs(value)}%</span>
      <span className={cn('opacity-30 font-medium whitespace-nowrap text-[7px] sm:text-[8px]', labelClassName)}>vs sem. préc.</span>
    </div>
  );
}

function MetricSummary({
  title,
  value,
  unit,
  changePercent,
  align = 'left',
  valueClassName,
  unitClassName,
}: MetricSummaryProps) {
  return (
    <div className={cn('space-y-1.5 sm:space-y-2', align === 'right' && 'text-right')}>
      <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.15em]">{title}</p>
      <div className="space-y-0.5 sm:space-y-1">
        <div className={cn('flex items-baseline gap-1', align === 'right' && 'justify-end')}>
          <span className={cn('text-xl sm:text-2xl md:text-3xl font-black text-foreground tabular-nums tracking-tighter', valueClassName)}>
            {value}
          </span>
          {unit && (
            <span className={cn('text-[8px] sm:text-[10px] font-bold text-muted-foreground/20 uppercase tracking-widest', unitClassName)}>
              {unit}
            </span>
          )}
        </div>
        <ChangeIndicator value={changePercent} align={align} />
      </div>
    </div>
  );
}

function ProjectionCard({
  variant,
  km,
  durationSeconds,
  changePercent,
  changePercentDuration,
}: {
  variant: ProjectionVariant;
  km: number;
  durationSeconds: number;
  changePercent: number | null;
  changePercentDuration: number | null;
}) {
  const styles = PROJECTION_STYLES[variant];

  return (
    <div className={cn('space-y-2.5 sm:space-y-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl', styles.container)}>
      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
        <div className={cn('w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full', styles.dot)} />
        <span className={cn('text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none', styles.labelClassName)}>
          {styles.label}
        </span>
      </div>
      <div className="space-y-1.5 sm:space-y-2">
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl md:text-2xl font-black tabular-nums tracking-tighter">{km}</span>
            <span className={cn(styles.kmUnitClassName, 'text-[8px] sm:text-[9px]')}>KM</span>
          </div>
          <ChangeIndicator value={changePercent} />
        </div>
        <div className="space-y-0.5">
          <p className={cn(styles.durationClassName, 'text-[9px] sm:text-[10px]')}>{formatDuration(durationSeconds)}</p>
          <ChangeIndicator value={changePercentDuration} />
        </div>
      </div>
    </div>
  );
}

export function EvolutionTooltipContent({ active, payload, label, granularity, coordinate, containerEl }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0 || !coordinate || !containerEl || typeof document === 'undefined') return null;

  const data = payload[0].payload as BucketChartDataPoint;
  const {
    changePercent,
    changePercentWithPlanned,
    changePercentDuration,
    changePercentDurationWithPlanned,
    completedCount,
    plannedCount,
    plannedKm,
    km,
    isCurrent,
    durationSeconds,
    totalWithPlanned,
    totalDurationWithPlanned,
  } = data;

  const totalSessionsGoal = completedCount + plannedCount;
  const hasPlanned = plannedKm > 0 || plannedCount > 0;
  const showProjection = hasPlanned;

  const rect = containerEl.getBoundingClientRect();
  const scrollLeft = containerEl.scrollLeft;

  const x = rect.left + coordinate.x - scrollLeft;
  const y = rect.top + coordinate.y;

  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isMobile = screenWidth < 640;
  const actualWidth = isMobile ? 280 : 320;
  const edgePadding = 16;

  let leftPos = x;
  let transformX = '-50%';

  if (x - actualWidth / 2 < edgePadding) {
    leftPos = edgePadding;
    transformX = '0%';
  } else if (x + actualWidth / 2 > screenWidth - edgePadding) {
    leftPos = screenWidth - edgePadding;
    transformX = '-100%';
  }

  const tooltipApproxHeight = showProjection ? 420 : 220;
  let topPos = y - 32;
  let transformY = '-100%';

  if (y - tooltipApproxHeight < edgePadding) {
    topPos = y + 32;
    transformY = '0%';
  }

  return createPortal(
    <div
      className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[280px] sm:w-[320px] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10"
      style={{
        position: 'fixed',
        left: leftPos,
        top: topPos,
        transform: `translate(${transformX}, ${transformY})`,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">{label}</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {granularity === 'week' && data.trainingWeek && (
                <h4 className="text-lg sm:text-xl font-black text-foreground tracking-tighter italic leading-none">SEMAINE {data.trainingWeek}</h4>
              )}
              {isCurrent && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-500 text-[8px] font-black uppercase tracking-widest">
                  <span className="h-1 w-1 rounded-full bg-violet-500 animate-pulse" />
                  En cours
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <Activity size={10} className="text-muted-foreground" />
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-black tabular-nums">{completedCount}</span>
                {showProjection && totalSessionsGoal > 0 && (
                  <span className="text-[9px] text-muted-foreground/40 font-bold">/ {totalSessionsGoal}</span>
                )}
                <span className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-wider ml-0.5">sessions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {!showProjection ? (
          <div className="grid grid-cols-2 gap-8">
            <MetricSummary title="Volume total" value={km} unit="KM" changePercent={changePercent} />
            <MetricSummary
              title="Durée totale"
              value={formatDuration(durationSeconds)}
              changePercent={changePercentDuration}
              align="right"
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <ProjectionCard
                variant="realized"
                km={km}
                durationSeconds={durationSeconds}
                changePercent={changePercent}
                changePercentDuration={changePercentDuration}
              />
              <ProjectionCard
                variant="projected"
                km={totalWithPlanned}
                durationSeconds={totalDurationWithPlanned}
                changePercent={changePercentWithPlanned}
                changePercentDuration={changePercentDurationWithPlanned}
              />
            </div>

          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
