import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatsCards } from '../stats-cards';

describe('StatsCards', () => {
  it('should render all stats correctly', () => {
    render(
      <StatsCards
        totalKm={150.5}
        totalSessions={12}
        totalDurationSeconds={36000}
        averageKm={37.6}
        averageDurationSeconds={9000}
        averageSessions={3}
        granularity="week"
      />
    );

    expect(screen.getByText('150.5')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/volume total/i)).toBeInTheDocument();
    expect(screen.getByText(/séances totales/i)).toBeInTheDocument();
    expect(screen.getByText(/durée totale/i)).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    render(
      <StatsCards
        totalKm={0}
        totalSessions={0}
        totalDurationSeconds={0}
        averageKm={0}
        averageDurationSeconds={0}
        averageSessions={0}
        granularity="week"
      />
    );

    const zeroValues = screen.getAllByText('0.0');
    expect(zeroValues.length).toBe(3);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
