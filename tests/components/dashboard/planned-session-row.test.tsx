import { render, screen } from '@testing-library/react';
import { PlannedSessionRow } from '@/components/dashboard/planned-session-row';
import { describe, it, expect, vi } from 'vitest';
import { TrainingSession } from '@/lib/types';

vi.mock('lucide-react', () => ({
  CheckCircle: () => <span>CheckCircle</span>,
  Trash2: () => <span>Trash2</span>,
  ChevronDown: () => <span>ChevronDown</span>,
}));

describe('PlannedSessionRow', () => {
  const mockSession: TrainingSession = {
    id: '1',
    sessionNumber: 36,
    week: 1,
    date: '2023-10-01',
    sessionType: 'Fractionné',
    duration: null,
    distance: null,
    avgPace: null,
    avgHeartRate: null,
    status: 'planned',
    targetPace: '04:15',
    targetDuration: 45,
    targetDistance: 8,
    comments: 'Test',
    userId: 'user-1',
    intervalDetails: {
      workoutType: 'VMA',
      repetitionCount: 6,
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
        { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: 1.7, pace: '05:53', hr: 155 },
        { stepNumber: 2, stepType: 'effort', duration: '02:50', distance: 0.67, pace: '04:15', hr: 194 },
        { stepNumber: 3, stepType: 'recovery', duration: '01:30', distance: 0.25, pace: '06:00', hr: 165 },
        { stepNumber: 4, stepType: 'effort', duration: '02:50', distance: 0.67, pace: '04:15', hr: 194 },
        { stepNumber: 5, stepType: 'recovery', duration: '01:30', distance: 0.25, pace: '06:00', hr: 165 },
        { stepNumber: 6, stepType: 'effort', duration: '02:50', distance: 0.67, pace: '04:15', hr: 194 },
        { stepNumber: 7, stepType: 'recovery', duration: '01:30', distance: 0.25, pace: '06:00', hr: 165 },
        { stepNumber: 8, stepType: 'effort', duration: '02:50', distance: 0.67, pace: '04:15', hr: 194 },
        { stepNumber: 9, stepType: 'recovery', duration: '01:30', distance: 0.25, pace: '06:00', hr: 165 },
        { stepNumber: 10, stepType: 'effort', duration: '02:50', distance: 0.67, pace: '04:15', hr: 194 },
        { stepNumber: 11, stepType: 'recovery', duration: '01:30', distance: 0.25, pace: '06:00', hr: 165 },
        { stepNumber: 12, stepType: 'effort', duration: '02:50', distance: 0.67, pace: '04:15', hr: 194 },
        { stepNumber: 13, stepType: 'cooldown', duration: '10:00', distance: 1.5, pace: '06:40', hr: 150 },
      ]
    }
  };

  it('devrait calculer la moyenne pondérée globale correctement (05:16)', () => {
    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={mockSession}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('~05:16 mn/km')).toBeDefined();
    
    expect(screen.getByText(/~170 bpm/)).toBeDefined();
    
    expect(screen.getByText('~8.47 km')).toBeDefined();
  });

  it('devrait utiliser les valeurs cibles si les étapes sont absentes', () => {
    const simpleSession = { ...mockSession, intervalDetails: null, targetDistance: 10, targetDuration: 60 };
    render(
      <table>
        <tbody>
          <PlannedSessionRow
            session={simpleSession}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText(/~10.00 km/)).toBeDefined();
    expect(screen.getByText(/~01:00:00/)).toBeDefined();
    expect(screen.getByText(/~06:00/)).toBeDefined();
  });
});
