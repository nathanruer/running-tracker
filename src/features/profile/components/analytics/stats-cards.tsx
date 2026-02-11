import { cn } from '@/lib/utils';
import type { ChartGranularity } from '@/lib/domain/analytics/date-range';
import { formatDuration } from '@/lib/utils/duration/format';

interface StatsCardsProps {
  totalKm: number;
  totalSessions: number;
  totalDurationSeconds: number;
  averageKm: number;
  averageDurationSeconds: number;
  averageSessions: number;
  granularity: ChartGranularity;
}

export function StatsCards({ 
  totalKm, 
  totalSessions, 
  totalDurationSeconds, 
  averageKm, 
  averageDurationSeconds,
  averageSessions,
  granularity 
}: StatsCardsProps) {
  const avgUnit = granularity === 'day' ? '/j' : granularity === 'month' ? '/m' : '/sem';

  const stats = [
    {
      label: 'Volume Total',
      total: totalKm.toFixed(1),
      totalUnit: 'km',
      average: averageKm.toFixed(1),
      averageUnit: `km${avgUnit}`,
      color: 'bg-violet-600'
    },
    {
      label: 'Durée Totale',
      total: formatDuration(totalDurationSeconds),
      totalUnit: '',
      average: formatDuration(Math.round(averageDurationSeconds)),
      averageUnit: avgUnit,
      color: 'bg-amber-500'
    },
    {
      label: 'Séances Totales',
      total: totalSessions.toString(),
      totalUnit: 'sessions',
      average: averageSessions.toFixed(1),
      averageUnit: `sess${avgUnit}`,
      color: 'bg-blue-600'
    }
  ];

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-10">
      {stats.map((stat, i) => (
        <div 
          key={i}
          className="group relative flex flex-col justify-between p-7 rounded-[2.5rem] border border-border/40 bg-card/10 backdrop-blur-md shadow-2xl overflow-hidden"
        >
          {/* Accent bar */}
          <div className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-r-full shadow-[0_0_15px_rgba(0,0,0,0.2)]",
            stat.color
          )} />
          
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/30 leading-none">
              {stat.label}
            </p>
            
            <div className="flex items-end justify-between gap-4">
              {/* Main Total Section */}
              <div className="flex items-baseline gap-2">
                <span className="text-4xl lg:text-5xl font-black tracking-tighter text-foreground leading-none">
                  {stat.total}
                </span>
                {stat.totalUnit && (
                  <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                    {stat.totalUnit}
                  </span>
                )}
              </div>

              {/* Secondary Average Section */}
              <div className="flex flex-col items-end border-l border-border/20 pl-5 h-12 justify-center">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-foreground/40 tabular-nums leading-none tracking-tight">
                    {stat.average}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground/30 uppercase leading-none">
                    {stat.averageUnit}
                  </span>
                </div>
                <p className="text-[8px] font-black text-muted-foreground/20 uppercase tracking-[0.2em] leading-none mt-2">
                  Moyenne
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
