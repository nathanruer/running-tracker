import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from '../stat-card';
import { Activity } from 'lucide-react';

describe('StatCard', () => {
  it('should render label, value and description', () => {
    render(
      <StatCard
        label="Total Distance"
        value={42.5}
        unit="km"
        description="Last 7 days"
        icon={Activity}
      />
    );

    expect(screen.getByText('Total Distance')).toBeInTheDocument();
    expect(screen.getByText('42.5 km')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('should render without unit', () => {
    render(
      <StatCard
        label="Sessions"
        value={12}
        description="This month"
        icon={Activity}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should apply custom gradient class', () => {
    const { container } = render(
      <StatCard
        label="Test"
        value={10}
        description="Test desc"
        icon={Activity}
        gradientClass="gradient-orange"
      />
    );

    const icon = container.querySelector('.gradient-orange');
    expect(icon).toBeInTheDocument();
  });

  it('should apply default gradient class', () => {
    const { container } = render(
      <StatCard
        label="Test"
        value={10}
        description="Test desc"
        icon={Activity}
      />
    );

    const icon = container.querySelector('.gradient-violet');
    expect(icon).toBeInTheDocument();
  });
});
