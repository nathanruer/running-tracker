import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnvironmentCard } from '../environment-card';
import type { WeatherData } from '@/lib/types/weather';

vi.mock('@/lib/services/weather', () => ({
  getWeatherLabel: vi.fn((code: number) => {
    if (code === 0) return 'Ensoleillé';
    if (code === 1) return 'Majoritairement clair';
    if (code === 2) return 'Partiellement nuageux';
    if (code === 61) return 'Pluie';
    return 'Inconnu';
  }),
}));

vi.mock('@/lib/utils/weather-icons', () => ({
  WeatherIcon: ({ className }: { code: number; className?: string }) => (
    <svg data-testid="weather-icon" className={className} />
  ),
}));

describe('EnvironmentCard', () => {
  const mockWeatherData: WeatherData = {
    conditionCode: 2,
    temperature: 18.3,
    apparentTemperature: 15.2,
    humidity: 65,
    windSpeed: 12.7,
    precipitation: 0.0,
  };

  it('should render temperature rounded', () => {
    render(<EnvironmentCard weather={mockWeatherData} />);
    expect(screen.getByTestId('environment-temp')).toHaveTextContent('18°');
  });

  it('should render feels like temperature when different from actual', () => {
    render(<EnvironmentCard weather={mockWeatherData} />);
    expect(screen.getByText('ressenti 15°')).toBeInTheDocument();
  });

  it('should not render feels like when same as actual temperature', () => {
    const weatherSameFeelsLike = { ...mockWeatherData, apparentTemperature: 18.4 };
    render(<EnvironmentCard weather={weatherSameFeelsLike} />);
    expect(screen.queryByText(/ressenti/)).not.toBeInTheDocument();
  });

  it('should not render feels like when not available', () => {
    const weatherNoFeelsLike = { ...mockWeatherData, apparentTemperature: undefined };
    render(<EnvironmentCard weather={weatherNoFeelsLike} />);
    expect(screen.queryByText(/ressenti/)).not.toBeInTheDocument();
  });

  it('should render weather condition label', () => {
    render(<EnvironmentCard weather={mockWeatherData} />);
    expect(screen.getByText('Partiellement nuageux')).toBeInTheDocument();
  });

  it('should render wind speed rounded', () => {
    render(<EnvironmentCard weather={mockWeatherData} />);
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('km/h')).toBeInTheDocument();
  });

  it('should render humidity', () => {
    render(<EnvironmentCard weather={mockWeatherData} />);
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
    expect(screen.getByText('Humidité')).toBeInTheDocument();
  });

  it('should render dash when humidity not available', () => {
    const weatherNoHumidity = { ...mockWeatherData, humidity: undefined };
    render(<EnvironmentCard weather={weatherNoHumidity} />);
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('should render precipitation', () => {
    render(<EnvironmentCard weather={mockWeatherData} />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('mm')).toBeInTheDocument();
  });

  it('should handle negative temperature', () => {
    const weatherCold = { ...mockWeatherData, temperature: -5.7 };
    render(<EnvironmentCard weather={weatherCold} />);
    expect(screen.getByTestId('environment-temp')).toHaveTextContent('-6°');
  });

  it('should handle zero temperature', () => {
    const weatherZero = { ...mockWeatherData, temperature: 0 };
    render(<EnvironmentCard weather={weatherZero} />);
    expect(screen.getByTestId('environment-temp')).toHaveTextContent('0°');
  });

  it('should render weather icon', () => {
    render(<EnvironmentCard weather={mockWeatherData} />);
    expect(screen.getByTestId('weather-icon')).toBeInTheDocument();
  });

  it('should render all sub-metric labels', () => {
    render(<EnvironmentCard weather={mockWeatherData} />);
    expect(screen.getByText('Vent')).toBeInTheDocument();
    expect(screen.getByText('Humidité')).toBeInTheDocument();
    expect(screen.getByText('Précip.')).toBeInTheDocument();
  });
});
