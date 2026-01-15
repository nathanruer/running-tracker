import { describe, it, expect } from 'vitest';
import { generateIntervalStructure, formatDurationAlwaysMMSS } from '../format';
import type { IntervalDetails } from '@/lib/types';

describe('interval-format', () => {
  describe('generateIntervalStructure', () => {
    it('should return empty string for null/undefined', () => {
      expect(generateIntervalStructure(null)).toBe('');
      expect(generateIntervalStructure(undefined)).toBe('');
    });

    it('should generate structure with all required fields', () => {
      const interval: IntervalDetails = {
        workoutType: 'VMA',
        repetitionCount: 8,
        effortDuration: '05:00',
        recoveryDuration: '02:00',
        effortDistance: null,
        recoveryDistance: null,
        targetEffortPace: null,
        targetEffortHR: null,
        targetRecoveryPace: null,
        steps: [],
      };
      expect(generateIntervalStructure(interval)).toBe('VMA: 8x05:00 R:02:00');
    });

    it('should generate structure from steps', () => {
      const interval: IntervalDetails = {
        workoutType: 'Custom',
        repetitionCount: null,
        effortDuration: null,
        recoveryDuration: null,
        effortDistance: null,
        recoveryDistance: null,
        targetEffortPace: null,
        targetEffortHR: null,
        targetRecoveryPace: null,
        steps: [
          { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: null, pace: null, hr: null },
          { stepNumber: 2, stepType: 'effort', duration: '05:00', distance: null, pace: null, hr: null },
          { stepNumber: 3, stepType: 'recovery', duration: '02:00', distance: null, pace: null, hr: null },
          { stepNumber: 4, stepType: 'effort', duration: '05:00', distance: null, pace: null, hr: null },
        ],
      };
      expect(generateIntervalStructure(interval)).toBe('Custom: 2x05:00 R:02:00');
    });
    
    it('should return workoutType only when missing data', () => {
        const interval: IntervalDetails = {
          workoutType: 'VMA',
          repetitionCount: null,
          effortDuration: null,
          recoveryDuration: null,
          effortDistance: null,
          recoveryDistance: null,
          targetEffortPace: null,
          targetEffortHR: null,
          targetRecoveryPace: null,
          steps: [],
        };
        expect(generateIntervalStructure(interval)).toBe('VMA');
      });
  });

  describe('formatDurationAlwaysMMSS', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDurationAlwaysMMSS(0)).toBe('00:00');
      expect(formatDurationAlwaysMMSS(125)).toBe('02:05');
      expect(formatDurationAlwaysMMSS(600)).toBe('10:00');
    });

    it('should round seconds', () => {
      expect(formatDurationAlwaysMMSS(125.4)).toBe('02:05');
      expect(formatDurationAlwaysMMSS(125.6)).toBe('02:06');
    });
  });
});
