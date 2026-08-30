import { describe, it, expect } from 'vitest';
import {
  actualsFromSteps,
  deriveStructureTargets,
  familyFromSession,
  familyLabelSql,
  intervalDetailsFromV3,
  intervalDetailsToStructure,
  planStructureForCompleted,
  sessionTypeFromStructure,
  structureToIntervalDetails,
} from '../structure';
import type { IntervalDetails } from '@/lib/types';

const vmaDetails: IntervalDetails = {
  workoutType: 'VMA',
  repetitionCount: 3,
  effortDuration: '01:00',
  recoveryDuration: '01:00',
  effortDistance: null,
  recoveryDistance: null,
  targetEffortPace: '03:45',
  targetEffortHR: 175,
  targetRecoveryPace: '06:00',
  steps: [
    { stepNumber: 1, stepType: 'warmup', duration: '15:00', distance: null, pace: '06:30', hr: null },
    { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: null, pace: '03:45', hr: 175 },
    { stepNumber: 3, stepType: 'recovery', duration: '01:00', distance: null, pace: '06:00', hr: null },
    { stepNumber: 4, stepType: 'effort', duration: '01:00', distance: null, pace: '03:45', hr: 175 },
    { stepNumber: 5, stepType: 'recovery', duration: '01:00', distance: null, pace: '06:00', hr: null },
    { stepNumber: 6, stepType: 'effort', duration: '01:00', distance: null, pace: '03:45', hr: 175 },
    { stepNumber: 7, stepType: 'recovery', duration: '01:00', distance: null, pace: '06:00', hr: null },
    { stepNumber: 8, stepType: 'cooldown', duration: '10:00', distance: null, pace: null, hr: null },
  ],
};

describe('familyFromSession', () => {
  it('maps legacy labels and workout types to families', () => {
    expect(familyFromSession('Footing', null)).toBe('footing');
    expect(familyFromSession('Sortie longue', null)).toBe('long');
    expect(familyFromSession('Fractionné', { ...vmaDetails, workoutType: 'SEUIL' })).toBe('threshold');
    expect(familyFromSession('Fractionné', { ...vmaDetails, workoutType: 'TEMPO' })).toBe('tempo');
    expect(familyFromSession('Fractionné', vmaDetails)).toBe('vma_short');
    expect(familyFromSession('Fractionné', { ...vmaDetails, effortDuration: '03:00' })).toBe('vma_long');
    expect(familyFromSession('Fractionné', { ...vmaDetails, effortDistance: 0.8 })).toBe('vma_long');
    expect(
      familyFromSession('Fractionné', {
        ...vmaDetails,
        effortDuration: null,
        steps: [{ stepNumber: 1, stepType: 'effort', duration: '03:00', distance: 0.9, pace: null, hr: null }],
      })
    ).toBe('vma_long');
    expect(familyFromSession('Trail', null)).toBe('other');
    expect(familyFromSession(null, null)).toBeNull();
  });
});

describe('intervalDetailsToStructure', () => {
  it('groups repeated effort/recovery steps into a repeat block', () => {
    const structure = intervalDetailsToStructure(vmaDetails, 'Fractionné', { durationS: 2400, distanceM: null });

    expect(structure.kind).toBe('interval');
    expect(structure.family).toBe('vma_short');
    expect(structure.label).toBeUndefined();
    expect(structure.blocks).toEqual([
      { type: 'warmup', target: { duration_s: 900 }, intensity: { pace_s_km: 390 } },
      {
        type: 'repeat',
        times: 3,
        blocks: [
          { type: 'work', target: { duration_s: 60 }, intensity: { pace_s_km: 225, hr_bpm: 175 } },
          { type: 'recovery', target: { duration_s: 60 }, intensity: { pace_s_km: 360 } },
        ],
      },
      { type: 'cooldown', target: { duration_s: 600 } },
    ]);
  });

  it('prefers the distance target when it disagrees with duration × pace', () => {
    const details: IntervalDetails = {
      ...vmaDetails,
      steps: [{ stepNumber: 1, stepType: 'effort', duration: '01:00', distance: 0.4, pace: '03:45', hr: null }],
    };
    const structure = intervalDetailsToStructure(details, 'Fractionné', { durationS: null, distanceM: null });

    expect(structure.blocks).toEqual([
      { type: 'work', target: { distance_m: 400 }, intensity: { pace_s_km: 225 } },
    ]);
  });

  it('synthesizes blocks from quick-mode fields when no steps are given', () => {
    const structure = intervalDetailsToStructure(
      { ...vmaDetails, steps: [], repetitionCount: 5, effortDistance: 0.4, recoveryDuration: '01:30' },
      'Fractionné',
      { durationS: null, distanceM: null }
    );

    expect(structure.blocks).toEqual([
      {
        type: 'repeat',
        times: 5,
        blocks: [
          { type: 'work', target: { distance_m: 400 }, intensity: { pace_s_km: 225, hr_bpm: 175 } },
          { type: 'recovery', target: { duration_s: 90 }, intensity: { pace_s_km: 360 } },
        ],
      },
    ]);
  });

  it('builds a continuous structure from the session targets and keeps custom labels', () => {
    const footing = intervalDetailsToStructure(null, 'Footing', { durationS: 2700, distanceM: 6000, paceSKm: 360, hrBpm: 145 });
    expect(footing).toEqual({
      kind: 'continuous',
      family: 'footing',
      blocks: [{ type: 'work', target: { duration_s: 2700 }, intensity: { pace_s_km: 360, hr_bpm: 145 } }],
    });

    const trail = intervalDetailsToStructure(null, 'Trail', { durationS: null, distanceM: 12000 });
    expect(trail).toEqual({
      kind: 'continuous',
      family: 'other',
      label: 'Trail',
      blocks: [{ type: 'work', target: { distance_m: 12000 } }],
    });
    expect(sessionTypeFromStructure(trail.family, trail)).toBe('Trail');
    expect(sessionTypeFromStructure('long', footing)).toBe('Sortie longue');
  });
});

describe('structureToIntervalDetails', () => {
  it('round-trips a legacy interval session', () => {
    const structure = intervalDetailsToStructure(vmaDetails, 'Fractionné', { durationS: 2400, distanceM: null });
    const details = structureToIntervalDetails(structure);

    expect(details).toEqual({
      ...vmaDetails,
      effortDistance: null,
      recoveryDistance: null,
      steps: vmaDetails.steps.map((step) => ({ ...step, hr: step.hr ?? null })),
    });
  });

  it('returns null for continuous structures and unknown values', () => {
    expect(structureToIntervalDetails({ kind: 'continuous', family: 'footing', blocks: [] })).toBeNull();
    expect(structureToIntervalDetails(null)).toBeNull();
    expect(structureToIntervalDetails('oops')).toBeNull();
  });

  it('derives quick fields from the work blocks when there is no repeat group', () => {
    const details = structureToIntervalDetails({
      kind: 'interval',
      family: 'tempo',
      blocks: [
        { type: 'warmup', target: { duration_s: 600 } },
        { type: 'work', target: { duration_s: 1500 }, intensity: { pace_s_km: 270 } },
        { type: 'cooldown', target: { duration_s: 600 } },
      ],
    });

    expect(details).toMatchObject({
      workoutType: 'TEMPO',
      repetitionCount: 1,
      effortDuration: '25:00',
      recoveryDuration: null,
      targetEffortPace: '04:30',
    });
    expect(details?.steps).toHaveLength(3);
  });
});

describe('completed sessions: plan from quick fields, steps as actual intervals', () => {
  it('builds the plan from the quick fields even when steps are present', () => {
    const structure = planStructureForCompleted(vmaDetails, 'Fractionné', { durationS: null, distanceM: null });

    expect(structure.blocks).toEqual([
      {
        type: 'repeat',
        times: 3,
        blocks: [
          { type: 'work', target: { duration_s: 60 }, intensity: { pace_s_km: 225, hr_bpm: 175 } },
          { type: 'recovery', target: { duration_s: 60 }, intensity: { pace_s_km: 360 } },
        ],
      },
    ]);
  });

  it('converts steps to actual interval rows and back', () => {
    const actuals = actualsFromSteps(vmaDetails.steps);
    expect(actuals[1]).toEqual({ position: 2, kind: 'work', movingS: 60, distanceM: null, paceSKm: 225, avgHr: 175 });

    const structure = planStructureForCompleted(vmaDetails, 'Fractionné', { durationS: null, distanceM: null });
    const details = intervalDetailsFromV3(structure, actuals);
    expect(details).toMatchObject({ workoutType: 'VMA', repetitionCount: 3, effortDuration: '01:00', targetEffortPace: '03:45' });
    expect(details?.steps).toEqual(vmaDetails.steps.map((step) => ({ ...step, hr: step.hr ?? null })));
  });

  it('keeps actual steps even when the plan is continuous', () => {
    const details = intervalDetailsFromV3(
      { kind: 'continuous', family: 'footing', blocks: [] },
      [{ position: 1, kind: 'work', movingS: 600, distanceM: 1500, paceSKm: 400, avgHr: 140 }]
    );
    expect(details?.workoutType).toBeNull();
    expect(details?.steps).toEqual([
      { stepNumber: 1, stepType: 'effort', duration: '10:00', distance: 1.5, pace: '06:40', hr: 140 },
    ]);
  });
});

describe('deriveStructureTargets', () => {
  it('sums durations and distances through repeats using paces', () => {
    const structure = intervalDetailsToStructure(vmaDetails, 'Fractionné', { durationS: null, distanceM: null });
    expect(deriveStructureTargets(structure.blocks)).toEqual({ durationS: 1860, distanceM: 3608 });
  });
});

describe('familyLabelSql', () => {
  it('maps every labelled family and falls back to the stored label', () => {
    const sql = familyLabelSql('p');
    expect(sql).toContain("COALESCE(p.structure->>'label'");
    expect(sql).toContain("WHEN 'vma_short' THEN 'Fractionné'");
    expect(sql).toContain("WHEN 'long' THEN 'Sortie longue'");
    expect(sql).not.toContain("WHEN 'other'");
  });
});
