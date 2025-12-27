import { TrendingUp, Activity, Calendar } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface StatsCardsProps {
  totalKm: number;
  totalSessions: number;
  averageKmPerWeek: number;
}

export function StatsCards({ totalKm, totalSessions, averageKmPerWeek }: StatsCardsProps) {
  return (
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
            {totalKm.toFixed(1)} km
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
            {totalSessions}
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
            {averageKmPerWeek.toFixed(1)} km
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Par semaine en moyenne
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
