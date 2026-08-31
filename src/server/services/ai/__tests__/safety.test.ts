import { describe, it, expect, vi } from 'vitest';
import { applyFormLimits } from '../safety';
import { buildAthleteForm } from '../context/form-context';
import type { AIResponseValidated } from '@/lib/validation/schemas/ai-response';
import type { Session } from '@/lib/types';

vi.mock('@/server/infrastructure/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn() } }));

const TODAY = new Date('2026-08-31T09:00:00Z');

const run = (date: string, distance: number, duration: string, pace: string, type = 'Footing'): Session =>
  ({
    date,
    localDate: date,
    sessionType: type,
    distance,
    duration,
    avgPace: pace,
    comments: '',
    avgHeartRate: 0,
    perceivedExertion: 0,
  }) as Session;

// Ce que Nathan a réellement couru : 3 footings de ~5 km par semaine, un tempo dimanche.
const LOG = [
  run('2026-08-30', 5.31, '00:29:37', '05:35', 'Fractionné'),
  run('2026-08-27', 5.2, '00:32:55', '06:20'),
  run('2026-08-25', 4.77, '00:28:57', '06:04'),
  run('2026-08-23', 4.89, '00:32:09', '06:35'),
  run('2026-08-20', 5.25, '00:30:44', '05:52'),
  run('2026-08-18', 4.62, '00:31:43', '06:52'),
  run('2026-08-11', 5.31, '00:34:45', '06:32'),
  run('2026-05-08', 5.26, '00:30:59', '05:53'),
];

const proposal = (sessions: Array<Record<string, unknown>>): AIResponseValidated =>
  ({
    responseType: 'recommendations',
    rationale: 'test',
    recommended_sessions: sessions,
  }) as unknown as AIResponseValidated;

describe('applyFormLimits', () => {
  const form = buildAthleteForm(LOG, TODAY);

  it('reads the measured form out of the log', () => {
    expect(form.longestRunKm).toBe(5.31);
    expect(form.weeklyKm).toBeCloseTo(15.3, 1);
    expect(form.easyPaceSKm).toBeGreaterThan(360);
    expect(form.breakDays).toBeGreaterThan(60);
    expect(form.weeksSinceReturn).toBeGreaterThanOrEqual(2);
  });

  it('brings back the long run the coach blew up', () => {
    const capped = applyFormLimits(
      proposal([{ session_type: 'Sortie longue', duration_min: 95, estimated_distance_km: 17.5, target_pace_min_km: '05:25' }]),
      form
    );

    const session = capped.responseType === 'recommendations' ? capped.recommended_sessions[0] : null;
    expect(session?.estimated_distance_km).toBeLessThanOrEqual(8);
    expect(session?.target_pace_min_km).toBe('06:07');
  });

  it('refuses an interval pace the athlete has never held', () => {
    const capped = applyFormLimits(
      proposal([
        {
          session_type: 'Fractionné',
          duration_min: 60,
          estimated_distance_km: 11,
          target_pace_min_km: '05:25',
          interval_details: {
            workoutType: 'VMA',
            repetitionCount: 6,
            targetEffortPace: '04:38',
            steps: [{ stepNumber: 1, stepType: 'effort', duration: '04:38', distance: 1, pace: '04:38', hr: 185 }],
          },
        },
      ]),
      form
    );

    const session = capped.responseType === 'recommendations' ? capped.recommended_sessions[0] : null;
    expect(session?.interval_details?.targetEffortPace).toBe('05:15');
    expect(session?.interval_details?.steps?.[0].pace).toBe('05:15');
  });

  it('keeps the week within a fifth of what was run last week', () => {
    const capped = applyFormLimits(
      proposal([
        { session_type: 'Footing', duration_min: 45, estimated_distance_km: 7.1, target_pace_min_km: '06:20' },
        { session_type: 'Footing', duration_min: 45, estimated_distance_km: 7.1, target_pace_min_km: '06:20' },
        { session_type: 'Sortie longue', duration_min: 70, estimated_distance_km: 10.8, target_pace_min_km: '06:30' },
      ]),
      form
    );

    const sessions = capped.responseType === 'recommendations' ? capped.recommended_sessions : [];
    const total = sessions.reduce((sum, session) => sum + (session.estimated_distance_km ?? 0), 0);
    expect(total).toBeLessThanOrEqual(form.weeklyKm * 1.2 + 0.1);
  });

  it('leaves a sensible week untouched', () => {
    const week = proposal([
      { session_type: 'Footing', duration_min: 35, estimated_distance_km: 5.4, target_pace_min_km: '06:30' },
      { session_type: 'Sortie longue', duration_min: 50, estimated_distance_km: 7.5, target_pace_min_km: '06:40' },
    ]);

    const capped = applyFormLimits(week, form);
    const sessions = capped.responseType === 'recommendations' ? capped.recommended_sessions : [];
    expect(sessions[0].estimated_distance_km).toBeCloseTo(5.38, 1);
    expect(sessions[1].estimated_distance_km).toBeCloseTo(7.5, 1);
    expect(sessions[1].target_pace_min_km).toBe('06:40');
  });

  it('does nothing without a measured form', () => {
    const week = proposal([{ session_type: 'Footing', duration_min: 45, estimated_distance_km: 20 }]);
    expect(applyFormLimits(week, null)).toBe(week);
  });
});
