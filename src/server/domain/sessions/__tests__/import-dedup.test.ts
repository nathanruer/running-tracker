import { describe, it, expect, vi } from 'vitest';

vi.mock('@/server/database', () => ({ prisma: {} }));

import { matchesExistingWorkout, type WorkoutWindow } from '../import-dedup';

const legacyWorkout = (day: string, distanceMeters: number | null): WorkoutWindow => ({
  time: new Date(`${day}T00:00:00.000Z`).getTime(),
  distanceMeters,
});

describe('matchesExistingWorkout', () => {
  describe('legacy midnight-dated workouts (day-level match)', () => {
    it('matches an activity on the same civil day with close distance', () => {
      const existing = [legacyWorkout('2026-05-08', 5260)];
      expect(
        matchesExistingWorkout(existing, new Date('2026-05-08T16:30:00.000Z'), 5300)
      ).toBe(true);
    });

    it('rejects a fragment whose distance is far from the stored session', () => {
      const existing = [legacyWorkout('2025-12-10', 7850)];
      expect(
        matchesExistingWorkout(existing, new Date('2025-12-10T17:00:00.000Z'), 2020)
      ).toBe(false);
    });

    it('rejects an activity on a different day even with equal distance', () => {
      const existing = [legacyWorkout('2026-05-08', 6000)];
      expect(
        matchesExistingWorkout(existing, new Date('2026-05-09T16:30:00.000Z'), 6000)
      ).toBe(false);
    });

    it('uses the Paris civil day for activities just after midnight', () => {
      const existing = [legacyWorkout('2026-05-09', 6000)];
      expect(
        matchesExistingWorkout(existing, new Date('2026-05-08T22:30:00.000Z'), 6000)
      ).toBe(true);
    });

    it('matches on day alone when the stored session has no distance', () => {
      const existing = [legacyWorkout('2026-05-08', null)];
      expect(
        matchesExistingWorkout(existing, new Date('2026-05-08T10:00:00.000Z'), 5000)
      ).toBe(true);
    });
  });

  describe('timestamped workouts (precise window)', () => {
    it('matches within the 3-minute window and distance tolerance', () => {
      const existing: WorkoutWindow[] = [
        { time: new Date('2026-05-08T16:30:00.000Z').getTime(), distanceMeters: 5260 },
      ];
      expect(
        matchesExistingWorkout(existing, new Date('2026-05-08T16:31:00.000Z'), 5300)
      ).toBe(true);
    });

    it('rejects outside the 3-minute window', () => {
      const existing: WorkoutWindow[] = [
        { time: new Date('2026-05-08T16:30:00.000Z').getTime(), distanceMeters: 5260 },
      ];
      expect(
        matchesExistingWorkout(existing, new Date('2026-05-08T17:00:00.000Z'), 5260)
      ).toBe(false);
    });
  });
});
