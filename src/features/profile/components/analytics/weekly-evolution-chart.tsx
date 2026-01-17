import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
            Distance parcourue par semaine
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
            <LineChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                angle={chartData.length > 8 ? -45 : 0}
                textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                height={chartData.length > 8 ? 60 : 30}
              />
              
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '11px' }}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value) => `${value}`}
              />
              
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  padding: '12px',
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  
                  const data = payload[0].payload as WeeklyData;
                  const { changePercent, completedCount, plannedKm, plannedCount } = data;

                  return (
                    <div className="bg-background border border-border rounded-xl p-3 shadow-lg min-w-[180px]">
                      <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-border/50">
                        <p className="font-bold text-sm text-foreground">{label}</p>
                        {data.trainingWeek && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">
                            Sem {data.trainingWeek}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {data.km > 0 ? (
                          <>
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-muted-foreground text-xs">Distance</span>
                              <span className="font-bold text-base">{data.km} km</span>
                            </div>
                            <p className="text-muted-foreground text-[10px]">
                              {completedCount} séance{completedCount > 1 ? 's' : ''}
                            </p>
                          </>
                        ) : plannedKm > 0 ? (
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="text-muted-foreground text-xs">Prévu</span>
                            <span className="font-bold text-base text-muted-foreground">{plannedKm} km</span>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-xs italic py-1">Aucune activité</p>
                        )}

                        {(changePercent !== null && data.km > 0) && (
                          <div className="pt-2 border-t border-border/50">
                            <p className={`flex items-center gap-1 font-bold text-xs ${
                              changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent)}%
                              <span className="font-normal text-[10px] text-muted-foreground ml-auto">vs préc.</span>
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
                height={36}
                formatter={(value) => (
                  <span className="text-[11px] font-medium text-muted-foreground/80">{value}</span>
                )}
              />
              
              <Line
                type="monotone"
                dataKey="km"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                name="Distance réalisée"
                isAnimationActive={true}
              />
              
              <Line
                type="monotone"
                dataKey="totalWithPlanned"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                opacity={0.3}
                dot={false}
                activeDot={{ r: 4, fill: '#9ca3af' }}
                name="Prévisionnel"
                isAnimationActive={true}
              />
            </LineChart>
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
