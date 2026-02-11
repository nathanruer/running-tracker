import { getWeatherLabel } from '@/lib/services/weather';
import { WeatherIcon } from '@/lib/utils/weather-icons';
import type { WeatherData } from '@/lib/types/weather';
import { Wind, Droplets, Gauge } from 'lucide-react';

interface EnvironmentCardProps {
  weather: WeatherData;
}

export function EnvironmentCard({ weather }: EnvironmentCardProps) {
  const wind = Math.round(weather.windSpeed);
  const precip = weather.precipitation;
  const label = getWeatherLabel(weather.conditionCode);
  const feelsLike = weather.apparentTemperature !== undefined
    ? Math.round(weather.apparentTemperature)
    : null;
  const showFeelsLike = feelsLike !== null && feelsLike !== Math.round(weather.temperature);

  return (
    <div className="rounded-2xl bg-muted/40 dark:bg-white/[0.03] border border-border/40 p-6 overflow-hidden relative group transition-all duration-300">
      <div className="relative z-10 flex items-center justify-between gap-6 mb-8">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="environment-temp"
              className="text-5xl font-black tracking-tighter leading-none"
            >
              {Math.round(weather.temperature)}°
            </span>
            {showFeelsLike && (
              <span className="text-sm font-medium text-muted-foreground/60 tracking-tight">
                ressenti {feelsLike}°
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-muted-foreground mt-2 tracking-tight">{label}</span>
        </div>
        
        <div className="relative">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-background/40 dark:bg-white/[0.05] border border-border/40 backdrop-blur-sm">
            <WeatherIcon code={weather.conditionCode} className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center py-3 rounded-xl bg-background/40 dark:bg-white/[0.03] border border-border/20">
          <Wind className="w-3.5 h-3.5 text-muted-foreground/50 mb-2" />
          <span className="text-sm font-bold tabular-nums">{wind} <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">km/h</span></span>
          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">Vent</span>
        </div>

        <div className="flex flex-col items-center py-3 rounded-xl bg-background/40 dark:bg-white/[0.03] border border-border/20">
          <Gauge className="w-3.5 h-3.5 text-muted-foreground/50 mb-2" />
          <span className="text-sm font-bold tabular-nums">{weather.humidity ?? '-'} <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">%</span></span>
          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">Humidité</span>
        </div>

        <div className="flex flex-col items-center py-3 rounded-xl bg-background/40 dark:bg-white/[0.03] border border-border/20">
          <Droplets className="w-3.5 h-3.5 text-muted-foreground/50 mb-2" />
          <span className="text-sm font-bold tabular-nums">{precip.toFixed(1)} <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">mm</span></span>
          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">Précip.</span>
        </div>
      </div>
    </div>
  );
}
