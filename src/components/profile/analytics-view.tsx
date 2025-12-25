import { useMemo } from 'react';
import { TrendingUp, Activity, Calendar } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { type TrainingSession } from '@/lib/types';
import { useDateRangeFilter } from '@/hooks/use-date-range-filter';
import { calculateWeeklyStats } from '@/lib/domain/analytics/weekly-calculator';
import { ExportWeeklyAnalytics } from './export-weekly-analytics';

interface AnalyticsViewProps {
  sessions: TrainingSession[];
}

export function AnalyticsView({ sessions }: AnalyticsViewProps) {
  // Use date range filter hook for completed sessions
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === 'completed' && s.date),
    [sessions]
  );
  const {
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    filteredItems: filteredCompletedSessions,
    dateError: customDateError,
  } = useDateRangeFilter(completedSessions, 'all');

  const filteredPlannedSessions = useMemo(() => {
    const plannedSessions = sessions.filter((s) => s.status === 'planned' && s.week !== null);

    if (dateRange === 'all') return plannedSessions;

    const now = new Date();
    return plannedSessions.filter((session) => {
      const sessionDate = session.date ? new Date(session.date) : null;
      if (!sessionDate) return true;

      if (dateRange === '2weeks') {
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        return sessionDate >= twoWeeksAgo;
      } else if (dateRange === '4weeks') {
        const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        return sessionDate >= fourWeeksAgo;
      } else if (dateRange === '12weeks') {
        const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
        return sessionDate >= twelveWeeksAgo;
      } else if (dateRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;

        const startDate = customStartDate ? new Date(customStartDate + 'T00:00:00') : null;
        const endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : null;

        if (startDate && endDate) {
          return sessionDate >= startDate && sessionDate <= endDate;
        } else if (startDate) {
          return sessionDate >= startDate;
        } else if (endDate) {
          return sessionDate <= endDate;
        }
      }
      return true;
    });
  }, [sessions, dateRange, customStartDate, customEndDate]);

  const stats = useMemo(
    () => calculateWeeklyStats(filteredCompletedSessions, filteredPlannedSessions),
    [filteredCompletedSessions, filteredPlannedSessions]
  );

  return (
    <div className="mb-8">
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-border/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Kilomètres
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
              {stats.totalKm.toFixed(1)} km
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sur la période sélectionnée
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Séances Totales
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
              {stats.totalSessions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Entraînements enregistrés
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-green-500/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Moyenne Hebdomadaire
              </CardTitle>
              <Calendar className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
              {stats.averageKmPerWeek.toFixed(1)} km
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Par semaine en moyenne
            </p>
          </CardContent>
        </Card>
      </div>

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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <ExportWeeklyAnalytics data={stats.chartData} />
                <Select value={dateRange} onValueChange={(value) => setDateRange(value as '2weeks' | '4weeks' | '12weeks' | 'all' | 'custom')}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4weeks">4 dernières semaines</SelectItem>
                    <SelectItem value="12weeks">12 dernières semaines</SelectItem>
                    <SelectItem value="all">Toutes les données</SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {dateRange === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    Date de début
                  </Label>
                  <DatePicker
                    date={customStartDate ? new Date(customStartDate + 'T00:00:00') : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setCustomStartDate(`${year}-${month}-${day}`);
                      } else {
                        setCustomStartDate('');
                      }
                    }}
                    placeholder="Sélectionner la date de début"
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="end-date" className="text-sm font-medium">
                    Date de fin
                  </Label>
                  <DatePicker
                    date={customEndDate ? new Date(customEndDate + 'T00:00:00') : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setCustomEndDate(`${year}-${month}-${day}`);
                      } else {
                        setCustomEndDate('');
                      }
                    }}
                    placeholder="Sélectionner la date de fin"
                  />
                </div>
              </div>
            )}
            {customDateError && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3">
                {customDateError}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={stats.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
    </div>
  );
}
