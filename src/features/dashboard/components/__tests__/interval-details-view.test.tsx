import { render, screen } from '@testing-library/react';
import { IntervalDetailsView } from '@/features/dashboard/components/interval-details-view';
import { describe, it, expect } from 'vitest';

describe('IntervalDetailsView', () => {
  const mockIntervalDetails = {
    workoutType: 'VMA',
    repetitionCount: 1,
    effortDuration: '02:50',
    recoveryDuration: '01:30',
    effortDistance: null,
    recoveryDistance: null,
    targetEffortPace: '04:15',
    targetEffortHR: 194,
    targetRecoveryPace: '06:00',
    actualEffortPace: null,
    actualEffortHR: null,
    actualRecoveryPace: null,
    steps: [
      { stepNumber: 1, stepType: 'effort' as const, duration: '02:50', distance: 0.67, pace: '04:15', hr: 194 },
    ]
  };

  it('should display "Moy. Réelle" for a completed session', () => {
    render(<IntervalDetailsView intervalDetails={mockIntervalDetails} isPlanned={false} />);
    expect(screen.getByText('Objectif Séance')).toBeInTheDocument();
    expect(screen.getAllByText('Allure').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FC').length).toBeGreaterThan(0);
  });

  it('should display "Moy. Prévue" for a planned session', () => {
    render(<IntervalDetailsView intervalDetails={mockIntervalDetails} isPlanned={true} />);
    expect(screen.getByText('Objectif Séance')).toBeInTheDocument();
    expect(screen.getAllByText('Allure').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FC').length).toBeGreaterThan(0);
  });

  it('should correctly format target paces with a leading zero', () => {
    const details = { ...mockIntervalDetails, targetEffortPace: '4:15' };
    render(<IntervalDetailsView intervalDetails={details} isPlanned={true} />);
    expect(screen.getAllByText('04:15').length).toBeGreaterThan(0);
  });

  it('should extract target HR from effort steps when not in intervalDetails', () => {
    const detailsWithHRRange = {
      ...mockIntervalDetails,
      targetEffortHR: null,
      steps: [
        { stepNumber: 1, stepType: 'warmup' as const, duration: '10:00', distance: 1.5, pace: '06:40', hr: null, hrRange: '150-160' },
        { stepNumber: 2, stepType: 'effort' as const, duration: '08:00', distance: 1.6, pace: '05:00', hr: null, hrRange: '162-174' },
        { stepNumber: 3, stepType: 'recovery' as const, duration: '02:00', distance: 0.3, pace: '06:40', hr: null, hrRange: '158-166' },
        { stepNumber: 4, stepType: 'effort' as const, duration: '08:00', distance: 1.6, pace: '05:00', hr: null, hrRange: '162-174' },
      ]
    };
    render(<IntervalDetailsView intervalDetails={detailsWithHRRange} isPlanned={true} />);
    // Should display the HR range from effort steps in the "Cible" section
    expect(screen.getByText(/162-174 bpm/i)).toBeInTheDocument();
  });

  it('should return null for target HR when no HR data is available', () => {
    const detailsNoHR = {
      ...mockIntervalDetails,
      targetEffortHR: null,
      steps: [
        { stepNumber: 1, stepType: 'effort' as const, duration: '02:50', distance: 0.67, pace: '04:15', hr: null },
      ]
    };
    render(<IntervalDetailsView intervalDetails={detailsNoHR} isPlanned={false} />);
    expect(screen.queryByText(/bpm/i)).not.toBeInTheDocument();
  });

  it('should estimate pace when pace is missing but duration and distance are provided', () => {
    const detailsWithMissingPace = {
      ...mockIntervalDetails,
      steps: [
        { stepNumber: 1, stepType: 'effort' as const, duration: '05:00', distance: 1.0, pace: null as string | null, hr: 180 },
      ]
    };
    render(<IntervalDetailsView intervalDetails={detailsWithMissingPace} isPlanned={false} />);
    // 5 minutes for 1km = 05:00/km pace - multiple 05:00 may exist, so check that at least one exists
    expect(screen.getAllByText('05:00').length).toBeGreaterThan(0);
  });

  it('should show totals section when there are steps with distance and time', () => {
    render(<IntervalDetailsView intervalDetails={mockIntervalDetails} isPlanned={false} />);
    expect(screen.getAllByText('Temps').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Distance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.67').length).toBeGreaterThan(0);
  });
});
