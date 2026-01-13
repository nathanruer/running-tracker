import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface WeeklyData {
  semaine: string;
  km: number | null;
  totalWithPlanned: number | null;
  changePercent: number | null;
  completedCount: number;
  plannedKm: number;
  plannedCount: number;
  changePercentWithPlanned: number | null;
}

interface WeeklyEvolutionChartProps {
  chartData: WeeklyData[];
}

export function WeeklyEvolutionChart({
  chartData,
}: WeeklyEvolutionChartProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Évolution hebdomadaire</CardTitle>
              <CardDescription>
                Kilomètres parcourus par semaine
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
              <XAxis
                dataKey="semaine"
                stroke="#888"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#888"
                style={{ fontSize: '12px' }}
                label={{ value: 'Kilomètres', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number | undefined, name?: string) => {
                  if (value === undefined || name === 'km') {
                    return [`${value ?? 0} km`, 'Distance'];
                  }
                  return [value ?? 0, name ?? ''];
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    const changePercent = data.changePercent;
                    const completedCount = data.completedCount || 0;
                    const plannedKm = data.plannedKm || 0;
                    const plannedCount = data.plannedCount || 0;

                    return (
                      <div
                        style={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                      >
                        <p style={{
                          color: 'hsl(var(--foreground))',
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}>
                          {label}
                        </p>
                        {data.km !== null ? (
                          <>
                            <p style={{
                              color: 'hsl(var(--foreground))',
                              marginBottom: '2px',
                            }}>
                              Distance réalisée: <span style={{ fontWeight: '600' }}>{data.km} km</span>
                            </p>
                            <p style={{
                              color: '#9ca3af',
                              marginBottom: plannedKm > 0 ? '4px' : '8px',
                              fontSize: '0.75rem',
                            }}>
                              {completedCount} séance{completedCount > 1 ? 's' : ''} réalisée{completedCount > 1 ? 's' : ''}
                              {plannedCount > 0 && `, ${plannedCount} planifiée${plannedCount > 1 ? 's' : ''}`}
                            </p>
                            {plannedKm > 0 && (
                              <>
                                <p style={{
                                  color: '#9ca3af',
                                  marginBottom: '4px',
                                  fontSize: '0.875rem',
                                }}>
                                  + {plannedKm} km encore planifiés
                                </p>
                                <p style={{
                                  color: '#9ca3af',
                                  marginBottom: changePercent !== null ? '4px' : '0',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                }}>
                                  = {data.totalWithPlanned} km au total prévu
                                </p>
                              </>
                            )}
                          </>
                        ) : plannedKm > 0 ? (
                          <>
                            <p style={{
                              color: '#9ca3af',
                              marginBottom: '2px',
                            }}>
                              Total prévu: <span style={{ fontWeight: '600' }}>{plannedKm} km</span>
                            </p>
                            <p style={{
                              color: '#9ca3af',
                              marginBottom: data.changePercentWithPlanned !== null ? '4px' : '0',
                              fontSize: '0.75rem',
                            }}>
                              {plannedCount} séance{plannedCount > 1 ? 's' : ''} prévue{plannedCount > 1 ? 's' : ''}
                            </p>
                          </>
                        ) : null}
                        {changePercent !== null && (
                          <>
                            <p style={{
                              color: changePercent >= 0 ? '#10b981' : '#ef4444',
                              fontWeight: '600',
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              {changePercent >= 0 ? '↗ ' : '↘ '}
                              {changePercent >= 0 ? '+' : ''}{changePercent}%
                              <span style={{
                                fontWeight: '400',
                                fontSize: '0.75rem',
                                color: 'hsl(var(--muted-foreground))',
                                marginLeft: '4px',
                              }}>
                                vs semaine précédente
                              </span>
                            </p>
                            {data.changePercentWithPlanned !== null && data.changePercentWithPlanned !== changePercent && (
                              <p style={{
                                color: '#9ca3af',
                                fontWeight: '500',
                                fontSize: '0.75rem',
                                marginTop: '2px',
                                fontStyle: 'italic',
                              }}>
                                ({data.changePercentWithPlanned >= 0 ? '+' : ''}{data.changePercentWithPlanned}% si toutes les séances sont réalisées)
                              </p>
                            )}
                          </>
                        )}
                        {changePercent === null && data.changePercentWithPlanned !== null && (
                          <p style={{
                            color: data.changePercentWithPlanned >= 0 ? '#10b981' : '#ef4444',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            fontStyle: 'italic',
                            marginTop: '2px',
                          }}>
                            {data.changePercentWithPlanned >= 0 ? '↗ ' : '↘ '}
                            {data.changePercentWithPlanned >= 0 ? '+' : ''}{data.changePercentWithPlanned}% prévu vs semaine précédente
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="km"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7 }}
                name="Kilomètres réalisés"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="totalWithPlanned"
                stroke="transparent"
                strokeWidth={0}
                dot={{ fill: '#9ca3af', strokeWidth: 2, r: 5, opacity: 0.7 }}
                activeDot={{ r: 7, fill: '#9ca3af' }}
                name="Total prévu (réalisé + planifié)"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center text-muted-foreground">
            <p>Aucune donnée disponible pour cette période</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
