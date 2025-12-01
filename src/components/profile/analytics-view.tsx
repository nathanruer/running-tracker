import { useState } from 'react';
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

interface AnalyticsViewProps {
  sessions: TrainingSession[];
}

export function AnalyticsView({ sessions }: AnalyticsViewProps) {
  const [dateRange, setDateRange] = useState<'week' | '30days' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const getFilteredSessions = () => {
    const now = new Date();
    const completedSessions = sessions.filter((s) => s.status === 'completed' && s.date);

    const filtered = completedSessions.filter((session) => {
      const sessionDate = new Date(session.date!);
      if (dateRange === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return sessionDate >= oneWeekAgo;
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return sessionDate >= thirtyDaysAgo;
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
    return filtered;
  };

  const filteredSessions = getFilteredSessions();

  const calculateStats = () => {
    if (!filteredSessions || filteredSessions.length === 0) {
      return {
        totalKm: 0,
        totalSessions: 0,
        averageKmPerWeek: 0,
        chartData: []
      };
    }

    const weeklyKm: Record<number, number> = {};
    const weeklyPlannedKm: Record<number, number> = {};
    const weeklyCompletedCount: Record<number, number> = {};
    const weeklyPlannedCount: Record<number, number> = {};
    let totalKm = 0;

    filteredSessions.forEach((session) => {
      const week = session.week;
      if (week === null) return;

      const distance = session.distance || 0;
      if (!weeklyKm[week]) {
        weeklyKm[week] = 0;
        weeklyCompletedCount[week] = 0;
      }
      weeklyKm[week] += distance;
      weeklyCompletedCount[week]++;
      totalKm += distance;
    });

    const now = new Date();
    const plannedSessions = sessions.filter((s) => s.status === 'planned' && s.week !== null);
    
    const filteredPlannedSessions = plannedSessions.filter((session) => {
      if (dateRange === 'all') return true;
      
      const sessionDate = session.date ? new Date(session.date) : null;
      if (!sessionDate) {
        return true;
      }
      
      if (dateRange === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return sessionDate >= oneWeekAgo;
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return sessionDate >= thirtyDaysAgo;
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

    filteredPlannedSessions.forEach((session) => {
      const week = session.week;
      if (week === null) return;

      const distance = session.distance || 0;
      if (!weeklyPlannedKm[week]) {
        weeklyPlannedKm[week] = 0;
        weeklyPlannedCount[week] = 0;
      }
      weeklyPlannedKm[week] += distance;
      weeklyPlannedCount[week]++;
    });

    const weeks = Object.keys(weeklyKm).length;
    const averageKmPerWeek = weeks > 0 ? totalKm / weeks : 0;

    const allWeeks = new Set([...Object.keys(weeklyKm), ...Object.keys(weeklyPlannedKm)]);

    const chartData = Array.from(allWeeks)
      .map((week) => {
        const weekNum = Number(week);
        const completedKm = weeklyKm[weekNum] || 0;
        const plannedKm = weeklyPlannedKm[weekNum] || 0;

        return {
          semaine: `S${week}`,
          week: weekNum,
          km: completedKm > 0 ? Number(completedKm.toFixed(1)) : null,
          plannedKm: Number(plannedKm.toFixed(1)),
          totalWithPlanned: plannedKm > 0 ? Number((completedKm + plannedKm).toFixed(1)) : null,
          completedCount: weeklyCompletedCount[weekNum] || 0,
          plannedCount: weeklyPlannedCount[weekNum] || 0,
        };
      })
      .sort((a, b) => a.week - b.week)
      .map((data, index, array) => {
        if (index === 0) {
          return { ...data, changePercent: null, changePercentWithPlanned: null };
        }

        let previousKm = null;
        for (let i = index - 1; i >= 0; i--) {
          if (array[i].km !== null) {
            previousKm = array[i].km;
            break;
          }
        }

        const changePercent = data.km !== null && previousKm !== null && previousKm > 0
          ? ((data.km - previousKm) / previousKm) * 100
          : null;

        const changePercentWithPlanned = previousKm !== null && previousKm > 0 && data.totalWithPlanned !== null
          ? ((data.totalWithPlanned - previousKm) / previousKm) * 100
          : null;

        return {
          ...data,
          changePercent: changePercent !== null ? Number(changePercent.toFixed(1)) : null,
          changePercentWithPlanned: changePercentWithPlanned !== null ? Number(changePercentWithPlanned.toFixed(1)) : null,
        };
      });

    return {
      totalKm,
      totalSessions: filteredSessions.length,
      averageKmPerWeek,
      chartData,
    };
  };

  const stats = calculateStats();

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Évolution hebdomadaire</CardTitle>
                <CardDescription>
                  Kilomètres parcourus par semaine
                </CardDescription>
              </div>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Dernière semaine</SelectItem>
                  <SelectItem value="30days">30 derniers jours</SelectItem>
                  <SelectItem value="all">Toutes les données</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
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
                  formatter={(value: any, name: any) => {
                    if (name === 'km') {
                      return [`${value} km`, 'Distance'];
                    }
                    return [value, name];
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      const changePercent = data.changePercent;
                      const plannedKm = data.plannedKm || 0;
                      const completedCount = data.completedCount || 0;
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
