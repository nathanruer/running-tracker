import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useMemo, useState, useCallback } from 'react';
import { BarChart3, Activity } from 'lucide-react';
import type { BucketChartDataPoint } from '@/lib/domain/analytics/weekly-calculator';
import type { ChartGranularity } from '@/lib/domain/analytics/date-range';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EvolutionTooltipContent } from './evolution-tooltip';
import { computeYAxisConfig, formatXAxisTick } from './evolution-chart-axes';

interface EvolutionChartProps {
  chartData: BucketChartDataPoint[];
  granularity: ChartGranularity;
  onGranularityChange: (value: ChartGranularity) => void;
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
                    tickFormatter={(value, index) => formatXAxisTick(value, index, chartData)}
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
