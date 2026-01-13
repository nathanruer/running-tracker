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
    expect(screen.queryAllByText(/Moy. Réelle/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Moy. Prévue/i)).toBeNull();
  });

  it('should display "Moy. Prévue" for a planned session', () => {
    render(<IntervalDetailsView intervalDetails={mockIntervalDetails} isPlanned={true} />);
    expect(screen.queryAllByText(/Moy. Prévue/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Moy. Réelle/i)).toBeNull();
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
});
