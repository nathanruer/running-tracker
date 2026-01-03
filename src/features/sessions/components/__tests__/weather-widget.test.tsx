import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeatherWidget } from '../weather-widget';
import type { WeatherData } from '@/lib/types/weather';

vi.mock('@/lib/services/weather', () => ({
  getWeatherLabel: vi.fn((code: number) => {
    if (code === 0) return 'Ensoleillé';
    if (code === 1) return 'Majoritairement clair';
    if (code === 61) return 'Pluie';
    return 'Inconnu';
  }),
}));

describe('WeatherWidget', () => {
  const mockWeatherData: WeatherData = {
    conditionCode: 1,
    temperature: 15.5,
    windSpeed: 10.2,
    precipitation: 0.5,
  };

  it('should render temperature with 1 decimal', () => {
    render(<WeatherWidget weather={mockWeatherData} />);
    expect(screen.getByText('15.5°')).toBeInTheDocument();
  });

  it('should render weather condition label', () => {
    render(<WeatherWidget weather={mockWeatherData} />);
    expect(screen.getByText('Majoritairement clair')).toBeInTheDocument();
  });

  it('should render wind speed rounded', () => {
    render(<WeatherWidget weather={mockWeatherData} />);
    expect(screen.getByText('10 km/h')).toBeInTheDocument();
  });

  it('should render precipitation when greater than 0', () => {
    render(<WeatherWidget weather={mockWeatherData} />);
    expect(screen.getByText('0.5 mm')).toBeInTheDocument();
  });

  it('should not render precipitation when 0', () => {
    const weatherNoRain = { ...mockWeatherData, precipitation: 0 };
    render(<WeatherWidget weather={weatherNoRain} />);
    expect(screen.queryByText('0.0 mm')).not.toBeInTheDocument();
  });

  it('should handle negative temperature', () => {
    const weatherCold = { ...mockWeatherData, temperature: -5.3 };
    render(<WeatherWidget weather={weatherCold} />);
    expect(screen.getByText('-5.3°')).toBeInTheDocument();
  });

  it('should handle zero temperature', () => {
    const weatherZero = { ...mockWeatherData, temperature: 0 };
    render(<WeatherWidget weather={weatherZero} />);
    expect(screen.getByText('0.0°')).toBeInTheDocument();
  });

  it('should display timestamp when available', () => {
    const weatherWithTimestamp = { ...mockWeatherData, timestamp: 14 };
    render(<WeatherWidget weather={weatherWithTimestamp} />);
    expect(screen.getByText('14:00 UTC')).toBeInTheDocument();
  });

  it('should not display timestamp when not available', () => {
    render(<WeatherWidget weather={mockWeatherData} />);
    expect(screen.queryByText(/UTC/)).not.toBeInTheDocument();
  });
});
