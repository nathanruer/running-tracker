import { describe, it, expect } from 'vitest';
import { buildPlannedWorkoutFields, toPlannedOn } from '../planned-v3';

const TZ = 'Europe/Paris';

describe('toPlannedOn', () => {
  it('keeps a bare day and resolves instants to the civil day in zone', () => {
    expect(toPlannedOn('2026-09-02', TZ)?.toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(toPlannedOn('2026-09-01T22:30:00.000Z', TZ)?.toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(toPlannedOn(new Date('2026-09-01T22:30:00.000Z'), TZ)?.toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(toPlannedOn(null, TZ)).toBeNull();
    expect(toPlannedOn('nope', TZ)).toBeNull();
  });
});

describe('buildPlannedWorkoutFields', () => {
  const input = {
    sessionType: 'Fractionné',
    intervalDetails: {
      workoutType: 'VMA',
      repetitionCount: 8,
      effortDuration: '01:00',
      recoveryDuration: '01:00',
      effortDistance: null,
      recoveryDistance: null,
      targetEffortPace: '03:40',
      targetEffortHR: null,
      targetRecoveryPace: null,
      steps: [],
    },
    plannedDate: '2026-09-02',
    targetDuration: 45,
    targetDistance: 8.5,
    targetPace: '05:30',
    targetHeartRateBpm: '160',
    targetRPE: 7,
    recommendationId: 'rec-1',
    comments: 'VMA courte',
  };

  it('converts legacy targets to numeric columns and a v3 structure', () => {
    const fields = buildPlannedWorkoutFields(input, TZ, { completed: false });

    expect(fields).toMatchObject({
      plannedOn: new Date('2026-09-02T00:00:00Z'),
      timezone: TZ,
      family: 'vma_short',
      schemaVersion: 3,
      targetDurationS: 2700,
      targetDistanceM: 8500,
      targetPaceSKm: 330,
      targetHrBpm: 160,
      targetRpe: 7,
      origin: 'coach',
      recommendationId: 'rec-1',
      notes: 'VMA courte',
    });
    expect(fields.structure).toMatchObject({ kind: 'interval', family: 'vma_short' });
  });

  it('derives targets from the structure when the legacy targets are missing', () => {
    const fields = buildPlannedWorkoutFields(
      { ...input, targetDuration: null, targetDistance: null, targetPace: null, targetHeartRateBpm: null, recommendationId: null },
      TZ,
      { completed: false }
    );

    expect(fields.origin).toBe('manual');
    expect(fields.targetDurationS).toBe(960);
    expect(fields.targetDistanceM).toBe(2182);
  });
});
