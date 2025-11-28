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
import { type TrainingSession } from '@/lib/api';

interface AnalyticsViewProps {
  sessions: TrainingSession[];
}

export function AnalyticsView({ sessions }: AnalyticsViewProps) {
  const [dateRange, setDateRange] = useState<'week' | '30days' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const getFilteredSessions = () => {
    const now = new Date();
    const filtered = sessions.filter((session) => {
      const sessionDate = new Date(session.date);
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
    let totalKm = 0;

    filteredSessions.forEach((session) => {
      const week = session.week;
      if (!weeklyKm[week]) {
        weeklyKm[week] = 0;
      }
      weeklyKm[week] += session.distance;
      totalKm += session.distance;
    });

    const weeks = Object.keys(weeklyKm).length;
    const averageKmPerWeek = weeks > 0 ? totalKm / weeks : 0;

    const chartData = Object.entries(weeklyKm)
      .map(([week, km]) => ({
        semaine: `S${week}`,
        week: Number(week),
        km: Number(km.toFixed(1)),
      }))
      .sort((a, b) => a.week - b.week);

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
                  formatter={(value: any) => [`${value} km`, 'Distance']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="km"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Kilomètres"
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
