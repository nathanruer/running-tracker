import { render, screen } from '@testing-library/react';
import { IntervalDetailsView } from '@/components/dashboard/interval-details-view';
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

  it('devrait afficher "Moy. Réelle" pour une séance réalisée', () => {
    render(<IntervalDetailsView intervalDetails={mockIntervalDetails} isPlanned={false} />);
    expect(screen.queryAllByText(/Moy. Réelle/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Moy. Prévue/i)).toBeNull();
  });

  it('devrait afficher "Moy. Prévue" pour une séance planifiée', () => {
    render(<IntervalDetailsView intervalDetails={mockIntervalDetails} isPlanned={true} />);
    expect(screen.queryAllByText(/Moy. Prévue/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Moy. Réelle/i)).toBeNull();
  });

  it('devrait formater correctement les allures cibles avec un zéro initial', () => {
    const details = { ...mockIntervalDetails, targetEffortPace: '4:15' };
    render(<IntervalDetailsView intervalDetails={details} isPlanned={true} />);
    expect(screen.getAllByText('04:15').length).toBeGreaterThan(0);
  });
});
