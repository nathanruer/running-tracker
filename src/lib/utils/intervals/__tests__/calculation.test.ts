import { describe, it, expect, vi } from 'vitest';
import { calculateAverageDuration, autoFillIntervalDurations } from '../calculation';
import type { IntervalStep } from '@/lib/types';

describe('interval-calculation', () => {
  describe('calculateAverageDuration', () => {
    it('should return 0 for empty array', () => {
      expect(calculateAverageDuration([])).toBe(0);
    });

    it('should skip warmup and cooldown steps', () => {
      const steps: IntervalStep[] = [
        { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: null, pace: null, hr: null },
        { stepNumber: 2, stepType: 'effort', duration: '05:00', distance: null, pace: null, hr: null },
        { stepNumber: 3, stepType: 'cooldown', duration: '10:00', distance: null, pace: null, hr: null },
      ];
      expect(calculateAverageDuration(steps)).toBe(300);
    });

    it('should calculate average correctly', () => {
      const steps: IntervalStep[] = [
        { stepNumber: 1, stepType: 'effort', duration: '05:00', distance: null, pace: null, hr: null },
        { stepNumber: 2, stepType: 'recovery', duration: '02:00', distance: null, pace: null, hr: null },
        { stepNumber: 3, stepType: 'effort', duration: '05:00', distance: null, pace: null, hr: null },
      ];
      expect(calculateAverageDuration(steps)).toBe(240); // (300+120+300)/3 ? No, it filters work steps.
      // Wait, let's check logic: filterWorkSteps keeps effort & recovery.
      // So (300 + 120 + 300) / 3 = 720 / 3 = 240. Correct.
    });
  });

  describe('autoFillIntervalDurations', () => {
    it('should call setFormValue with average durations', () => {
      const mockSetFormValue = vi.fn();
      const steps: IntervalStep[] = [
        { stepNumber: 1, stepType: 'effort', duration: '05:00', distance: null, pace: null, hr: null },
        { stepNumber: 2, stepType: 'recovery', duration: '02:00', distance: null, pace: null, hr: null },
        { stepNumber: 3, stepType: 'effort', duration: '05:00', distance: null, pace: null, hr: null },
      ];

      autoFillIntervalDurations(steps, mockSetFormValue);

      expect(mockSetFormValue).toHaveBeenCalledWith('effortDuration', '05:00');
      expect(mockSetFormValue).toHaveBeenCalledWith('recoveryDuration', '02:00');
    });

    it('should not call setFormValue if no steps', () => {
      const mockSetFormValue = vi.fn();
      autoFillIntervalDurations([], mockSetFormValue);
      expect(mockSetFormValue).not.toHaveBeenCalled();
    });
  });
});
