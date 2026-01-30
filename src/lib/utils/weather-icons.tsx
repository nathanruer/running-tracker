import {
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
} from 'lucide-react';

interface WeatherIconProps {
  code: number;
  className?: string;
}

export function WeatherIcon({ code, className }: WeatherIconProps) {
  if (code === 0) return <Sun className={className} />;
  if (code === 1 || code === 2) return <CloudSun className={className} />;
  if (code === 3) return <Cloud className={className} />;
  if (code >= 45 && code <= 48) return <CloudFog className={className} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle className={className} />;
  if (code >= 61 && code <= 65) return <CloudRain className={className} />;
  if (code >= 71 && code <= 75) return <CloudSnow className={className} />;
  if (code >= 80 && code <= 82) return <CloudRain className={className} />;
  if (code >= 95 && code <= 99) return <CloudLightning className={className} />;
  return <Cloud className={className} />;
}
