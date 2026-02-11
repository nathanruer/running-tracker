import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useMemo, type ReactNode, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, Activity } from 'lucide-react';
import type { BucketChartDataPoint } from '@/lib/domain/analytics/weekly-calculator';
import type { ChartGranularity } from '@/lib/domain/analytics/date-range';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDuration } from '@/lib/utils/duration/format';

interface EvolutionChartProps {
  chartData: BucketChartDataPoint[];
  granularity: ChartGranularity;
  onGranularityChange: (value: ChartGranularity) => void;
}

type YAxisConfig = {
  domain: [number, number];
  ticks: number[];
};

type TooltipContentProps = {
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

function computeYAxisConfig(chartData: BucketChartDataPoint[]): YAxisConfig {
  if (chartData.length === 0) return { domain: [0, 50], ticks: [0, 25, 50] };

  const maxVal = Math.max(...chartData.map(d => (d.km || 0) + (d.plannedKm || 0)), 1);

  let niceMax = 10;
  let ticks = [0, 5, 10];

  if (maxVal <= 5) {
    niceMax = 5;
    ticks = [0, 1, 2, 3, 4, 5];
  } else if (maxVal <= 10) {
    niceMax = 10;
    ticks = [0, 2, 4, 6, 8, 10];
  } else if (maxVal <= 20) {
    niceMax = 20;
    ticks = [0, 5, 10, 15, 20];
  } else if (maxVal <= 40) {
    niceMax = 40;
    ticks = [0, 10, 20, 30, 40];
  } else if (maxVal <= 60) {
    niceMax = 60;
    ticks = [0, 15, 30, 45, 60];
  } else if (maxVal <= 100) {
    niceMax = 100;
    ticks = [0, 25, 50, 75, 100];
  } else if (maxVal <= 150) {
    niceMax = 150;
    ticks = [0, 50, 100, 150];
  } else {
    niceMax = Math.ceil((maxVal * 1.1) / 20) * 20;
    const step = niceMax / 4;
    ticks = [0, step, step * 2, step * 3, niceMax];
  }

  return { domain: [0, niceMax], ticks };
}

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

function EvolutionTooltipContent({ active, payload, label, granularity, coordinate, containerEl }: TooltipContentProps) {
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

  // Position calculation
  const rect = containerEl.getBoundingClientRect();
  const scrollLeft = containerEl.scrollLeft;
  
  // Calculate viewport coordinates from Recharts chart-space
  const x = rect.left + coordinate.x - scrollLeft;
  const y = rect.top + coordinate.y;

  // Constants for positioning
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isMobile = screenWidth < 640;
  const actualWidth = isMobile ? 280 : 320;
  const edgePadding = 16;
  
  let leftPos = x;
  let transformX = '-50%';
  
  // Smart horizontal anchoring
  if (x - actualWidth / 2 < edgePadding) {
    // Too close to left: anchor to the left edge
    leftPos = edgePadding;
    transformX = '0%';
  } else if (x + actualWidth / 2 > screenWidth - edgePadding) {
    // Too close to right: anchor to the right edge
    leftPos = screenWidth - edgePadding;
    transformX = '-100%';
  }

  // Vertical logic
  const tooltipApproxHeight = showProjection ? 420 : 220;
  let topPos = y - 32; // Increased offset for better visibility
  let transformY = '-100%';

  if (y - tooltipApproxHeight < edgePadding) {
    // Too close to top: show below the point
    topPos = y + 32; // Increased offset here too
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
      {/* Header Section */}
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
            {/* Session info integrated below title */}
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

export function EvolutionChart({ chartData, granularity, onGranularityChange }: EvolutionChartProps) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRefCb = useCallback((node: HTMLDivElement | null) => { setContainerEl(node); }, []);

  const stats = useMemo(() => {
    const activeWeeks = chartData.filter(d => d.km > 0);
    return {
      activeWeeksCount: activeWeeks.length,
    };
  }, [chartData]);

  const subtitle = useMemo(() => {
    if (granularity === 'day') return "Volume d'entraînement par jour";
    if (granularity === 'month') return "Volume d'entraînement par mois";
    return "Volume d'entraînement par semaine";
  }, [granularity]);

  const activeLabel = useMemo(() => {
    if (granularity === 'day') return 'jours actifs';
    if (granularity === 'month') return 'mois actifs';
    return 'semaines actives';
  }, [granularity]);

  const yAxisConfig = useMemo(() => computeYAxisConfig(chartData), [chartData]);

  const chartWidth = useMemo(() => {
    const pointCount = chartData.length;
    return `max(100%, ${pointCount * 10}px)`;
  }, [chartData.length]);

  return (
    <Card className="border-border/50 shadow-xl relative overflow-visible">
      <CardHeader className="pb-4">
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-bold tracking-tight">Évolution</CardTitle>
            <CardDescription className="text-sm">
              {subtitle}
              {stats.activeWeeksCount > 0 && (
                <span className="text-muted-foreground/50">
                  {' '}• {stats.activeWeeksCount} {activeLabel}
                </span>
              )}
            </CardDescription>
          </div>

          <div className="p-1 rounded-xl bg-muted/10 border border-border/40 backdrop-blur-xl shrink-0">
            <Select value={granularity} onValueChange={(value) => onGranularityChange(value as ChartGranularity)}>
              <SelectTrigger 
                data-testid="select-granularity" 
                className="h-8 md:h-9 px-3 border-none bg-transparent hover:bg-muted/10 data-[state=open]:bg-muted/10 rounded-lg shadow-none focus:ring-0 w-fit min-w-[100px] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all gap-2"
              >
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40 rounded-2xl shadow-2xl">
                <SelectItem value="day" className="rounded-xl">Jour</SelectItem>
                <SelectItem value="week" className="rounded-xl">Semaine</SelectItem>
                <SelectItem value="month" className="rounded-xl">Mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 relative px-0 sm:px-6">
        {chartData.length > 0 ? (
          <div ref={containerRefCb} className="overflow-x-auto pb-6 scrollbar-none md:scrollbar-thin md:scrollbar-thumb-muted md:scrollbar-track-transparent">
            <div style={{ 
              width: chartWidth,
              height: 500 
            }} className="px-4 sm:px-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={chartData} 
                  margin={{ top: 20, right: 40, left: -20, bottom: 20 }}
                  barCategoryGap={1}
                >
                  <CartesianGrid 
                    strokeDasharray="4 4" 
                    stroke="hsl(var(--border))" 
                    opacity={0.4} 
                    vertical={false} 
                  />
                  
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '10px', fontWeight: 600 }}
                    tick={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.7 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    padding={{ left: 10, right: 10 }}
                    tickFormatter={(value, index) => {
                      if (!value) return '';
                      const parts = value.split(/\s+/).filter((p: string) => !['-', '→', '–'].includes(p));
                      
                      if (parts.length >= 2) {
                        const dayPart = parts[0].split('-')[0];
                        const monthPart = parts[1].replace('.', '');
                        
                        const lastPart = parts[parts.length - 1];
                        const yearPart = /^\d{4}$/.test(lastPart) ? lastPart : null;
                        
                        const isFirst = index === 0;
                        const prevPoint = index > 0 ? chartData[index - 1] : null;
                        const prevYear = prevPoint?.label?.split(/\s+/).pop();
                        
                        if ((isFirst || (yearPart && prevYear && yearPart !== prevYear)) && yearPart) {
                          return `${dayPart} ${monthPart} ${yearPart}`;
                        }
                        return `${dayPart} ${monthPart}`;
                      }
                      return value;
                    }}
                  />
                  
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '10px', fontWeight: 500 }}
                    tick={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tickFormatter={(value) => `${value}km`}
                    domain={yAxisConfig.domain}
                    ticks={yAxisConfig.ticks}
                    allowDataOverflow={true}
                  />
                  
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.25 }}
                    allowEscapeViewBox={{ x: true, y: true }}
                    offset={20}
                    wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                    content={(props) => (
                      <EvolutionTooltipContent 
                        {...props} 
                        granularity={granularity} 
                        containerEl={containerEl}
                      />
                    )}
                  />
                  
                  <Legend 
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    height={44}
                    formatter={(value) => (
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">{value}</span>
                    )}
                  />
                  
                  <Bar
                    dataKey="km"
                    name="Réalisé"
                    stackId="a"
                    fill="url(#colorKm)"
                    isAnimationActive={false}
                    radius={[2, 2, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-realized-${entry.bucketKey}-${index}`} 
                        fill={entry.isCurrent ? '#8b5cf6' : '#8b5cf6'}
                        fillOpacity={entry.isCurrent ? 1 : 0.8}
                      />
                    ))}
                  </Bar>

                  <Bar
                    dataKey="plannedKm"
                    name="Prévu"
                    stackId="a"
                    fill="#9ca3af"
                    fillOpacity={0.2}
                    isAnimationActive={false}
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-planned-${entry.bucketKey}-${index}`} 
                        fillOpacity={entry.km === 0 ? 0.3 : 0.15}
                        stroke={entry.km === 0 ? "hsl(var(--muted-foreground))" : "none"}
                        strokeDasharray="4 4"
                        strokeWidth={entry.km === 0 ? 1 : 0}
                      />
                    ))}
                  </Bar>

                  <defs>
                    <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex h-[380px] items-center justify-center text-center">
            <div className="space-y-4">
              <div className="bg-muted w-12 h-12 rounded-2xl flex items-center justify-center mx-auto opacity-50">
                <Activity size={24} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-semibold text-sm">Aucune donnée sur cette période</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
