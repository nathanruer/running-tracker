import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useMemo } from 'react';

interface WeeklyData {
  label: string;
  weekKey: string;
  trainingWeek: number | null;
  km: number;
  totalWithPlanned: number;
  changePercent: number | null;
  completedCount: number;
  plannedKm: number;
  plannedCount: number;
  changePercentWithPlanned: number | null;
  gapWeeks: number;
  isActive: boolean;
}

interface WeeklyEvolutionChartProps {
  chartData: WeeklyData[];
}

export function WeeklyEvolutionChart({ chartData }: WeeklyEvolutionChartProps) {
  const stats = useMemo(() => {
    const activeWeeks = chartData.filter(d => d.km > 0);
    return {
      activeWeeksCount: activeWeeks.length,
    };
  }, [chartData]);

  return (
    <Card className="border-border/50 shadow-xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Évolution hebdomadaire</CardTitle>
          <CardDescription>
            Volume d&apos;entraînement par semaine
            {stats.activeWeeksCount > 0 && (
              <span className="text-muted-foreground/60">
                {' '}• {stats.activeWeeksCount} semaines actives
              </span>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '10px', fontWeight: 500 }}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval={chartData.length > 12 ? Math.floor(chartData.length / 8) : 0}
                padding={{ left: 10, right: 10 }}
              />
              
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '11px' }}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value) => `${value}km`}
              />
              
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  
                  const data = payload[0].payload as WeeklyData;
                  const { changePercent, changePercentWithPlanned, completedCount, plannedCount, km, plannedKm } = data;

                  const currentChange = data.km > 0 ? changePercent : changePercentWithPlanned;

                  return (
                    <div className="bg-background/95 backdrop-blur-md border border-border rounded-xl p-4 shadow-2xl min-w-[220px] animate-in fade-in zoom-in duration-200">
                      <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-border/50">
                        <p className="font-bold text-sm text-foreground">{label}</p>
                        {data.trainingWeek && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20">
                            Sem {data.trainingWeek}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {km > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-muted-foreground text-xs">Distance réalisée</span>
                              <span className="font-bold text-base text-violet-500">{km} km</span>
                            </div>
                            <p className="text-muted-foreground text-[10px]">
                              {completedCount} séance{completedCount > 1 ? 's' : ''} complétée{completedCount > 1 ? 's' : ''}
                            </p>
                          </div>
                        )}

                        {plannedKm > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-muted-foreground text-xs italic">
                                {km > 0 ? 'Reste à faire' : 'Prévu'}
                              </span>
                              <span className="font-bold text-sm text-muted-foreground/80">{plannedKm} km</span>
                            </div>
                            <p className="text-muted-foreground text-[10px] italic">
                              {plannedCount} séance{plannedCount > 1 ? 's' : ''} programmée{plannedCount > 1 ? 's' : ''}
                            </p>
                          </div>
                        )}

                        {km === 0 && plannedKm === 0 && (
                          <p className="text-muted-foreground text-xs italic py-1">Aucune activité</p>
                        )}

                        {currentChange !== null && (
                          <div className="pt-2 mt-1 border-t border-border/50 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Évolution</span>
                            <p className={`flex items-center gap-1 font-bold text-xs ${
                              currentChange >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {currentChange >= 0 ? '↑' : '↓'} {Math.abs(currentChange)}%
                              <span className="font-normal text-[10px] text-muted-foreground opacity-70"> vs préc.</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              
              <Legend 
                verticalAlign="top"
                align="right"
                iconType="circle"
                height={44}
                formatter={(value) => (
                  <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-tight">{value}</span>
                )}
              />
              
              <Bar
                dataKey="km"
                name="Distance réalisée"
                stackId="a"
                fill="#8b5cf6"
                barSize={32}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-realized-${index}`} 
                    fill="#8b5cf6"
                  />
                ))}
              </Bar>

              <Bar
                dataKey="plannedKm"
                name="Programmé"
                stackId="a"
                fill="#9ca3af"
                fillOpacity={0.3}
                barSize={32}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-planned-${index}`} 
                    fillOpacity={entry.km === 0 ? 0.4 : 0.2}
                    fill={entry.km === 0 ? "hsl(var(--muted-foreground))" : "#9ca3af"}
                    strokeDasharray={entry.km === 0 ? "4 4" : "0"}
                    stroke={entry.km === 0 ? "hsl(var(--muted-foreground))" : "none"}
                    strokeWidth={entry.km === 0 ? 1 : 0}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[380px] items-center justify-center text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground font-medium text-sm">Aucune donnée disponible</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
