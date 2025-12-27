import { describe, it, expect } from 'vitest';
import { STEP_TYPE_LABELS } from '../interval-step-fields';

describe('IntervalStepFields', () => {
  describe('STEP_TYPE_LABELS', () => {
    it('should export step type labels', () => {
      expect(STEP_TYPE_LABELS).toBeDefined();
    });

    it('should have label for warmup', () => {
      expect(STEP_TYPE_LABELS.warmup).toBe('Échauffement');
    });

    it('should have label for effort', () => {
      expect(STEP_TYPE_LABELS.effort).toBe('Effort');
    });

    it('should have label for recovery', () => {
      expect(STEP_TYPE_LABELS.recovery).toBe('Récupération');
    });

    it('should have label for cooldown', () => {
      expect(STEP_TYPE_LABELS.cooldown).toBe('Retour au calme');
    });

    it('should have exactly 4 step types', () => {
      expect(Object.keys(STEP_TYPE_LABELS)).toHaveLength(4);
    });

    it('should have all step types as keys', () => {
      expect(Object.keys(STEP_TYPE_LABELS)).toEqual([
        'warmup',
        'effort',
        'recovery',
        'cooldown',
      ]);
    });
  });
});
