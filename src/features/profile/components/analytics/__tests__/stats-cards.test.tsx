import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatsCards } from '../stats-cards';

describe('StatsCards', () => {
  it('should render all stats correctly', () => {
    render(
      <StatsCards 
        totalKm={150.5} 
        totalSessions={12} 
        averageKmPerWeek={37.6} 
      />
    );

    expect(screen.getByText('150.5')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('37.6')).toBeInTheDocument();
    
    expect(screen.getByText(/volume total/i)).toBeInTheDocument();
    expect(screen.getByText(/séances/i)).toBeInTheDocument();
    expect(screen.getByText(/moyenne hebdo/i)).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    render(
      <StatsCards 
        totalKm={0} 
        totalSessions={0} 
        averageKmPerWeek={0} 
      />
    );

    const kmValues = screen.getAllByText('0.0');
    expect(kmValues.length).toBe(2);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
