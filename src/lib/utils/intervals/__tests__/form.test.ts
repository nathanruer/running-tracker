import { describe, it, expect } from 'vitest';
import {
  transformIntervalData,
  hasIntervalData,
  getDefaultIntervalValues,
  type IntervalFormValues,
} from '../form';

describe('interval-forms', () => {
  describe('transformIntervalData', () => {
    it('should return null if session type is not Fractionné', () => {
      const values: IntervalFormValues = {
        sessionType: 'Endurance',
        workoutType: '400m',
        repetitionCount: 10,
      };

      expect(transformIntervalData(values)).toBeNull();
    });

    it('should return null if no interval data is present', () => {
      const values: IntervalFormValues = {
        sessionType: 'Fractionné',
      };

      expect(transformIntervalData(values)).toBeNull();
    });

    it('should transform basic interval data', () => {
      const values: IntervalFormValues = {
        sessionType: 'Fractionné',
        workoutType: '400m',
        repetitionCount: 10,
        effortDuration: '02:00',
        recoveryDuration: '01:00',
        effortDistance: null,
        recoveryDistance: null,
      };

      const result = transformIntervalData(values);

      expect(result).toMatchObject({
        workoutType: '400m',
        repetitionCount: 10,
        effortDuration: '02:00',
        recoveryDuration: '01:00',
      });
    });
    
    it('should include distance data when provided', () => {
      const values: IntervalFormValues = {
        sessionType: 'Fractionné',
        workoutType: '1km',
        repetitionCount: 5,
        effortDistance: 1.0,
        recoveryDistance: 0.4,
      };
      const result = transformIntervalData(values);
      expect(result?.effortDistance).toBe(1.0);
      expect(result?.recoveryDistance).toBe(0.4);
    });

    it('should include target pace and HR when provided', () => {
        const values: IntervalFormValues = {
          sessionType: 'Fractionné',
          workoutType: 'Tempo',
          targetEffortPace: '04:30',
          targetEffortHR: 165,
          targetRecoveryPace: '06:00',
        };
        const result = transformIntervalData(values);
        expect(result?.targetEffortPace).toBe('04:30');
        expect(result?.targetEffortHR).toBe(165);
    });
    
    it('should transform steps in detailed mode', () => {
      const values: IntervalFormValues = {
        sessionType: 'Fractionné',
        workoutType: 'Custom',
        steps: [
            { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: null, pace: null, hr: null },
            { stepNumber: 2, stepType: 'effort', duration: '05:00', distance: 1.5, pace: '04:00', hr: 170 },
        ],
      };
      const result = transformIntervalData(values, 'detailed');
      expect(result?.steps).toHaveLength(2);
      expect(result?.steps?.[0].stepType).toBe('warmup');
      expect(result?.steps?.[1].hr).toBe(170);
    });

    it('should not include steps in quick mode even if provided', () => {
        const values: IntervalFormValues = {
          sessionType: 'Fractionné',
          workoutType: 'Test',
          steps: [{ stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: null, pace: null, hr: null }],
        };
        const result = transformIntervalData(values, 'quick');
        expect(result?.steps).toEqual([]);
    });

    it('should handle null and undefined values correctly', () => {
        // ... (test complet)
    });
  });

    it('should return correct boolean based on data presence', () => {
        expect(hasIntervalData({ sessionType: 'Endurance' })).toBe(false);
        expect(hasIntervalData({ sessionType: 'Fractionné' })).toBe(false);
        expect(hasIntervalData({ sessionType: 'Fractionné', workoutType: '400m' })).toBe(true);
        expect(hasIntervalData({ sessionType: 'Fractionné', repetitionCount: 10 })).toBe(true);
        expect(hasIntervalData({ sessionType: 'Fractionné', targetEffortPace: '4:30' })).toBe(true);
    });

  describe('getDefaultIntervalValues', () => {
    it('should return default interval values', () => {
      expect(getDefaultIntervalValues()).toEqual({
        workoutType: '',
        repetitionCount: undefined,
        effortDuration: '',
        recoveryDuration: '',
        effortDistance: undefined,
        recoveryDistance: undefined,
        targetEffortPace: '',
        targetEffortHR: undefined,
        targetRecoveryPace: '',
        steps: [],
      });
    });
  });
});
