import { getWeatherLabel } from '@/lib/services/weather';
import type { WeatherData } from '@/lib/types/weather';
import { Wind, Droplets, Thermometer } from 'lucide-react';

interface WeatherWidgetProps {
  weather: WeatherData;
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  const wind = Math.round(weather.windSpeed);
  const precip = weather.precipitation;

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-muted-foreground" />
          <span className="text-xl font-light tracking-tight">{weather.temperature.toFixed(1)}°</span>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted-foreground">
            {getWeatherLabel(weather.conditionCode)}
          </span>
          {weather.timestamp !== undefined && (
            <span className="text-xs text-muted-foreground/70">
              {weather.timestamp}:00 UTC
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Wind className="w-3.5 h-3.5" />
          <span>{wind} km/h</span>
        </div>

        {precip > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Droplets className="w-3.5 h-3.5" />
            <span>{precip.toFixed(1)} mm</span>
          </div>
        )}
      </div>
    </div>
  );
}
