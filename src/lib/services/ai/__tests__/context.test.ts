import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildContextMessage, buildHistoryContext, calculateSessionTypeStats } from '../context';
import type { Session } from '@/lib/types';

describe('AI Context Building', () => {
  const userProfile = {
    age: 30,
    maxHeartRate: 190,
    vma: 15.0,
    goal: '10km sub 50',
  };

  // Mock Date to ensure consistent test results
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should include workout type distribution and compact quality history', () => {
    const sessions: Session[] = [
      {
        date: '2026-01-14T00:00:00.000Z',
        sessionType: 'Footing',
        duration: '00:45:00',
        distance: 7.5,
        avgPace: '06:00',
        avgHeartRate: 140,
        perceivedExertion: 3,
        comments: 'Easy run',
        intervalDetails: null,
        sessionNumber: 1,
        week: 1,
        status: 'completed',
      },
      {
        date: '2026-01-12T00:00:00.000Z',
        sessionType: 'Footing',
        duration: '00:45:00',
        distance: 7.5,
        avgPace: '06:00',
        avgHeartRate: 142,
        perceivedExertion: 3,
        comments: 'Another easy run',
        intervalDetails: null,
        sessionNumber: 2,
        week: 1,
        status: 'completed',
      },
      {
        date: '2026-01-10T00:00:00.000Z',
        sessionType: 'Fractionné',
        duration: '00:40:00',
        distance: 7.0,
        avgPace: '05:43',
        avgHeartRate: 165,
        perceivedExertion: 8,
        comments: 'Hard intervals',
        intervalDetails: {
          workoutType: 'VMA',
          repetitionCount: 10,
          effortDuration: '01:00',
          recoveryDuration: '01:00',
          effortDistance: null,
          recoveryDistance: null,
          targetEffortPace: null,
          targetEffortHR: null,
          targetRecoveryPace: null,
          steps: [
            { stepNumber: 1, stepType: 'warmup', duration: '15:00', distance: 2.5, pace: '06:00', hr: null },
            { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: 0.25, pace: '04:00', hr: 170 },
            { stepNumber: 3, stepType: 'recovery', duration: '01:00', distance: 0.15, pace: '06:40', hr: 140 },
            { stepNumber: 4, stepType: 'effort', duration: '01:00', distance: 0.25, pace: '04:00', hr: 172 },
            { stepNumber: 5, stepType: 'recovery', duration: '01:00', distance: 0.15, pace: '06:40', hr: 142 },
          ],
        },
        sessionNumber: 3,
        week: 1,
        status: 'completed',
      },
    ];

    const context = buildContextMessage({
      currentWeekSessions: [],
      allSessions: sessions,
      userProfile,
      nextSessionNumber: 4,
    });

    // Should have workout type distribution section
    expect(context).toContain('Distribution qualité (4 sem)');
    expect(context).toContain('VMA: 1 séance');
    expect(context).toContain('TEMPO: 0 séance');
    expect(context).toContain('SEUIL: 0 séance');

    // Should have compact quality history
    expect(context).toContain('Historique qualité récent');
    expect(context).toContain('VMA 10x01:00');

    // Should have endurance stats (not quality sessions in endurance section)
    expect(context).toContain('Stats endurance');
    expect(context).toContain('Footing: 2x');
    expect(context).not.toContain('Fractionné: 1x');
  });

  it('should handle empty sessions gracefully', () => {
    const context = buildContextMessage({
      currentWeekSessions: [],
      allSessions: [],
      userProfile,
      nextSessionNumber: 1,
    });

    expect(context).toContain('=== CONTEXTE UTILISATEUR ===');
    expect(context).toContain('=== FIN DU CONTEXTE ===');
    expect(context).toContain('Objectif : 10km sub 50');
  });

  it('should show distribution for multiple workout types', () => {
    const sessions: Session[] = [
      createQualitySession('2026-01-14', 'VMA', 8, '01:00'),
      createQualitySession('2026-01-12', 'TEMPO', 2, '15:00'),
      createQualitySession('2026-01-10', 'VMA', 10, '00:45'),
      createQualitySession('2026-01-08', 'SEUIL', 3, '10:00'),
    ];

    const context = buildContextMessage({
      currentWeekSessions: [],
      allSessions: sessions,
      userProfile,
      nextSessionNumber: 5,
    });

    expect(context).toContain('VMA: 2 séances');
    expect(context).toContain('TEMPO: 1 séance');
    expect(context).toContain('SEUIL: 1 séance');
    expect(context).toContain('SPÉCIFIQUE: 0 séance');
  });

  it('should exclude sessions outside the 4-week window from distribution', () => {
    const sessions: Session[] = [
      createQualitySession('2026-01-14', 'VMA', 8, '01:00'), // Within 4 weeks
      createQualitySession('2025-12-01', 'VMA', 10, '01:00'), // Outside 4 weeks
      createQualitySession('2025-11-15', 'TEMPO', 2, '15:00'), // Outside 4 weeks
    ];

    const context = buildContextMessage({
      currentWeekSessions: [],
      allSessions: sessions,
      userProfile,
      nextSessionNumber: 4,
    });

    // Only 1 VMA within window
    expect(context).toContain('VMA: 1 séance');
    // TEMPO session is outside window
    expect(context).toContain('TEMPO: 0 séance');
  });

  it('should show most recent date for each workout type', () => {
    const sessions: Session[] = [
      createQualitySession('2026-01-14', 'VMA', 8, '01:00'),
      createQualitySession('2026-01-10', 'VMA', 6, '01:00'),
    ];

    const context = buildContextMessage({
      currentWeekSessions: [],
      allSessions: sessions,
      userProfile,
      nextSessionNumber: 3,
    });

    // Should show most recent VMA date (01-14) not older one
    expect(context).toContain('dernière: 01-14');
    expect(context).toContain('8x01:00');
  });

  it('should return empty history message when no sessions', () => {
    const history = buildHistoryContext([]);

    expect(history).toContain('Historique : Aucune séance enregistrée');
  });

  it('should include totals in history context', () => {
    const sessions: Session[] = [
      createStandardSession('2026-01-14', 'Footing', 7.2, 140),
      createStandardSession('2026-01-12', 'Footing', 6.8, 135),
    ];

    const history = buildHistoryContext(sessions);

    expect(history).toContain('Historique global');
    expect(history).toContain('2 séances totales, 14.0 km');
  });

  it('should build standard stats with average HR', () => {
    const sessions: Session[] = [
      createStandardSession('2026-01-14', 'Footing', 7.2, 140),
      createStandardSession('2026-01-12', 'Footing', 6.8, 150),
    ];

    const stats = calculateSessionTypeStats(sessions);

    expect(stats).toContain('Statistiques (Endurance/Standard)');
    expect(stats).toContain('Footing (2 dern.)');
    expect(stats).toContain('FC 145');
  });

  it('should build quality stats with structure and sanitized note', () => {
    const sessions: Session[] = [
      createQualitySession('2026-01-14', 'VMA', 6, '01:00', 'Super séance\navec note'),
    ];

    const stats = calculateSessionTypeStats(sessions);

    expect(stats).toContain('Dernières séances de qualité');
    expect(stats).toContain('Structure: VMA: 6x01:00');
    expect(stats).toContain('Note: Super séance avec note');
  });
});

function createQualitySession(
  date: string,
  workoutType: string,
  reps: number,
  effortDuration: string,
  comments: string = ''
): Session {
  return {
    date: `${date}T00:00:00.000Z`,
    sessionType: 'Fractionné',
    duration: '00:50:00',
    distance: 8.0,
    avgPace: '06:15',
    avgHeartRate: 160,
    perceivedExertion: 7,
    comments,
    intervalDetails: {
      workoutType,
      repetitionCount: reps,
      effortDuration,
      recoveryDuration: '02:00',
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: null,
      targetEffortHR: null,
      targetRecoveryPace: null,
      steps: [],
    },
    sessionNumber: 1,
    week: 1,
    status: 'completed',
  };
}

function createStandardSession(
  date: string,
  sessionType: string,
  distance: number,
  avgHeartRate: number
): Session {
  return {
    date: `${date}T00:00:00.000Z`,
    sessionType,
    duration: '00:45:00',
    distance,
    avgPace: '06:15',
    avgHeartRate,
    perceivedExertion: 3,
    comments: '',
    intervalDetails: null,
    sessionNumber: 1,
    week: 1,
    status: 'completed',
  };
}
