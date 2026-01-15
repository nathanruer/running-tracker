import { describe, it, expect } from 'vitest';
import {
  filterStepsByType,
  filterStepsWithProperty,
  filterWorkSteps,
  groupStepsByType,
  getStepIndexInType,
  getStepLabel,
  getStepLabelAuto,
  getStepColor,
  getStepTextColor,
  countStepsByType,
} from '../steps';
import type { IntervalStep } from '@/lib/types';

const createStep = (overrides: Partial<IntervalStep> = {}): IntervalStep => ({
  stepNumber: 1,
  stepType: 'effort',
  duration: '05:00',
  distance: 1.0,
  pace: '05:00',
  hr: 160,
  ...overrides,
});

describe('step utilities', () => {
  describe('filterStepsByType', () => {
    const steps: IntervalStep[] = [
      createStep({ stepNumber: 1, stepType: 'warmup' }),
      createStep({ stepNumber: 2, stepType: 'effort' }),
      createStep({ stepNumber: 3, stepType: 'recovery' }),
      createStep({ stepNumber: 4, stepType: 'effort' }),
      createStep({ stepNumber: 5, stepType: 'cooldown' }),
    ];

    it('should return all steps when filter is "all"', () => {
      const result = filterStepsByType(steps, 'all');
      expect(result).toHaveLength(5);
    });

    it('should filter by effort type', () => {
      const result = filterStepsByType(steps, 'effort');
      expect(result).toHaveLength(2);
      expect(result.every(s => s.stepType === 'effort')).toBe(true);
    });

    it('should filter by warmup type', () => {
      const result = filterStepsByType(steps, 'warmup');
      expect(result).toHaveLength(1);
      expect(result[0].stepType).toBe('warmup');
    });

    it('should return empty array when no matches', () => {
      const effortOnly = [createStep({ stepType: 'effort' })];
      const result = filterStepsByType(effortOnly, 'warmup');
      expect(result).toHaveLength(0);
    });
  });

  describe('filterStepsWithProperty', () => {
    it('should filter steps with valid pace', () => {
      const steps: IntervalStep[] = [
        createStep({ pace: '05:00' }),
        createStep({ pace: null }),
        createStep({ pace: '06:00' }),
      ];
      const result = filterStepsWithProperty(steps, 'pace');
      expect(result).toHaveLength(2);
    });

    it('should filter steps with valid hr (positive number)', () => {
      const steps: IntervalStep[] = [
        createStep({ hr: 160 }),
        createStep({ hr: 0 }),
        createStep({ hr: null }),
        createStep({ hr: 150 }),
      ];
      const result = filterStepsWithProperty(steps, 'hr');
      expect(result).toHaveLength(2);
    });

    it('should filter steps with valid distance', () => {
      const steps: IntervalStep[] = [
        createStep({ distance: 1.0 }),
        createStep({ distance: 0 }),
        createStep({ distance: null }),
      ];
      const result = filterStepsWithProperty(steps, 'distance');
      expect(result).toHaveLength(1);
    });
  });

  describe('filterWorkSteps', () => {
    it('should exclude warmup and cooldown', () => {
      const steps: IntervalStep[] = [
        createStep({ stepType: 'warmup' }),
        createStep({ stepType: 'effort' }),
        createStep({ stepType: 'recovery' }),
        createStep({ stepType: 'effort' }),
        createStep({ stepType: 'cooldown' }),
      ];
      const result = filterWorkSteps(steps);
      expect(result).toHaveLength(3);
      expect(result.some(s => s.stepType === 'warmup')).toBe(false);
      expect(result.some(s => s.stepType === 'cooldown')).toBe(false);
    });

    it('should handle empty array', () => {
      expect(filterWorkSteps([])).toHaveLength(0);
    });
  });

  describe('groupStepsByType', () => {
    it('should group steps by type', () => {
      const steps: IntervalStep[] = [
        createStep({ stepType: 'warmup' }),
        createStep({ stepType: 'effort' }),
        createStep({ stepType: 'recovery' }),
        createStep({ stepType: 'effort' }),
        createStep({ stepType: 'cooldown' }),
      ];
      const result = groupStepsByType(steps);
      
      expect(result.warmup).toHaveLength(1);
      expect(result.effort).toHaveLength(2);
      expect(result.recovery).toHaveLength(1);
      expect(result.cooldown).toHaveLength(1);
    });

    it('should return empty arrays for missing types', () => {
      const steps: IntervalStep[] = [createStep({ stepType: 'effort' })];
      const result = groupStepsByType(steps);
      
      expect(result.warmup).toHaveLength(0);
      expect(result.effort).toHaveLength(1);
      expect(result.recovery).toHaveLength(0);
      expect(result.cooldown).toHaveLength(0);
    });
  });

  describe('getStepIndexInType', () => {
    const steps: IntervalStep[] = [
      createStep({ stepNumber: 1, stepType: 'warmup' }),
      createStep({ stepNumber: 2, stepType: 'effort' }),
      createStep({ stepNumber: 3, stepType: 'recovery' }),
      createStep({ stepNumber: 4, stepType: 'effort' }),
    ];

    it('should return 0 for first effort', () => {
      expect(getStepIndexInType(steps[1], steps)).toBe(0);
    });

    it('should return 1 for second effort', () => {
      expect(getStepIndexInType(steps[3], steps)).toBe(1);
    });

    it('should return 0 for single warmup', () => {
      expect(getStepIndexInType(steps[0], steps)).toBe(0);
    });
  });

  describe('getStepLabel', () => {
    it('should return "Échauf." for warmup in French', () => {
      const step = createStep({ stepType: 'warmup' });
      expect(getStepLabel(step, 0, 'fr')).toBe('Échauf.');
    });

    it('should return "Warmup" for warmup in English', () => {
      const step = createStep({ stepType: 'warmup' });
      expect(getStepLabel(step, 0, 'en')).toBe('Warmup');
    });

    it('should return "E1" for first effort', () => {
      const step = createStep({ stepType: 'effort' });
      expect(getStepLabel(step, 0, 'fr')).toBe('E1');
    });

    it('should return "E2" for second effort', () => {
      const step = createStep({ stepType: 'effort' });
      expect(getStepLabel(step, 1, 'fr')).toBe('E2');
    });

    it('should return "R1" for first recovery', () => {
      const step = createStep({ stepType: 'recovery' });
      expect(getStepLabel(step, 0, 'fr')).toBe('R1');
    });

    it('should return "Retour" for cooldown in French', () => {
      const step = createStep({ stepType: 'cooldown' });
      expect(getStepLabel(step, 0, 'fr')).toBe('Retour');
    });
  });

  describe('getStepLabelAuto', () => {
    const steps: IntervalStep[] = [
      createStep({ stepNumber: 1, stepType: 'warmup' }),
      createStep({ stepNumber: 2, stepType: 'effort' }),
      createStep({ stepNumber: 3, stepType: 'effort' }),
    ];

    it('should auto-calculate label for second effort', () => {
      expect(getStepLabelAuto(steps[2], steps, 'fr')).toBe('E2');
    });

    it('should return warmup label', () => {
      expect(getStepLabelAuto(steps[0], steps, 'fr')).toBe('Échauf.');
    });
  });

  describe('getStepColor', () => {
    it('should return blue for warmup', () => {
      expect(getStepColor('warmup')).toContain('blue');
    });

    it('should return red for effort', () => {
      expect(getStepColor('effort')).toContain('red');
    });

    it('should return green for recovery', () => {
      expect(getStepColor('recovery')).toContain('green');
    });

    it('should return purple for cooldown', () => {
      expect(getStepColor('cooldown')).toContain('purple');
    });
  });

  describe('getStepTextColor', () => {
    it('should return text-blue for warmup', () => {
      expect(getStepTextColor('warmup')).toBe('text-blue-500');
    });

    it('should return text-red for effort', () => {
      expect(getStepTextColor('effort')).toBe('text-red-500');
    });

    it('should return text-green for recovery', () => {
      expect(getStepTextColor('recovery')).toBe('text-green-500');
    });

    it('should return text-purple for cooldown', () => {
      expect(getStepTextColor('cooldown')).toBe('text-purple-500');
    });
  });

  describe('countStepsByType', () => {
    it('should count steps by type', () => {
      const steps: IntervalStep[] = [
        createStep({ stepType: 'warmup' }),
        createStep({ stepType: 'effort' }),
        createStep({ stepType: 'recovery' }),
        createStep({ stepType: 'effort' }),
        createStep({ stepType: 'recovery' }),
        createStep({ stepType: 'effort' }),
        createStep({ stepType: 'cooldown' }),
      ];
      const result = countStepsByType(steps);
      
      expect(result.warmup).toBe(1);
      expect(result.effort).toBe(3);
      expect(result.recovery).toBe(2);
      expect(result.cooldown).toBe(1);
    });

    it('should return zeros for empty array', () => {
      const result = countStepsByType([]);
      expect(result.warmup).toBe(0);
      expect(result.effort).toBe(0);
      expect(result.recovery).toBe(0);
      expect(result.cooldown).toBe(0);
    });
  });
});
