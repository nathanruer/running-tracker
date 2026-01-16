import { cn } from '@/lib/utils';

interface StatsCardsProps {
  totalKm: number;
  totalSessions: number;
  averageKmPerWeek: number;
}

export function StatsCards({ totalKm, totalSessions, averageKmPerWeek }: StatsCardsProps) {
  const stats = [
    {
      label: 'Volume Total',
      value: totalKm.toFixed(1),
      unit: 'km',
      color: 'bg-violet-600'
    },
    {
      label: 'Séances',
      value: totalSessions.toString(),
      unit: 'runs',
      color: 'bg-blue-600'
    },
    {
      label: 'Moyenne Hebdo',
      value: averageKmPerWeek.toFixed(1),
      unit: 'km/sem',
      color: 'bg-emerald-600'
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3 mb-10">
      {stats.map((stat, i) => (
        <div 
          key={i}
          className="group relative flex flex-col justify-center p-6 md:p-8 rounded-[2rem] border border-border/40 bg-card/20 backdrop-blur-sm transition-all hover:border-border/60 shadow-xl"
        >
          <div className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-r-full transition-all duration-500 group-hover:h-20",
            stat.color
          )} />
          
          <div className="space-y-6">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/30 leading-none">
              {stat.label}
            </p>
            
            <div className="flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
                {stat.value}
              </span>
              <span className="text-sm font-bold text-muted-foreground/40 leading-none">
                {stat.unit}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
