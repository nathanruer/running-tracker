import { describe, it, expect } from 'vitest';
import {
  calculateDistanceFromPace,
  isWithinTolerance,
  estimateEffectiveDistance,
  validateAndAdjustDistance,
  DISTANCE_VALIDATION,
} from '../calculate';

describe('distance utilities', () => {
  describe('DISTANCE_VALIDATION constants', () => {
    it('should have expected tolerance values', () => {
      expect(DISTANCE_VALIDATION.ABSOLUTE_TOLERANCE_KM).toBe(0.025);
      expect(DISTANCE_VALIDATION.RELATIVE_TOLERANCE_PERCENT).toBe(0.1);
      expect(DISTANCE_VALIDATION.AI_TOLERANCE_PERCENT).toBe(0.05);
    });
  });

  describe('calculateDistanceFromPace', () => {
    it('should calculate distance for 1 hour at 5:00/km pace', () => {
      // 1 hour = 3600 sec, 5:00/km = 300 sec/km
      // Distance = 3600 / 300 = 12 km
      expect(calculateDistanceFromPace(3600, 300)).toBe(12);
    });

    it('should calculate distance for 30 min at 6:00/km pace', () => {
      // 30 min = 1800 sec, 6:00/km = 360 sec/km
      // Distance = 1800 / 360 = 5 km
      expect(calculateDistanceFromPace(1800, 360)).toBe(5);
    });

    it('should return 0 for zero duration', () => {
      expect(calculateDistanceFromPace(0, 300)).toBe(0);
    });

    it('should return 0 for zero pace', () => {
      expect(calculateDistanceFromPace(1800, 0)).toBe(0);
    });

    it('should return 0 for negative values', () => {
      expect(calculateDistanceFromPace(-100, 300)).toBe(0);
      expect(calculateDistanceFromPace(1800, -300)).toBe(0);
    });
  });

  describe('isWithinTolerance', () => {
    it('should return true for identical distances', () => {
      expect(isWithinTolerance(10, 10)).toBe(true);
    });

    it('should return true for distances within absolute tolerance', () => {
      // Default absolute tolerance is 0.025 km (25m)
      expect(isWithinTolerance(10, 10.02)).toBe(true);
    });

    it('should return true for distances within relative tolerance', () => {
      // Default relative tolerance is 10%
      expect(isWithinTolerance(10, 10.5)).toBe(true); // 5% difference
    });

    it('should return false for distances outside tolerance', () => {
      expect(isWithinTolerance(10, 12)).toBe(false); // 20% difference
    });

    it('should use custom tolerances', () => {
      expect(isWithinTolerance(10, 10.5, { tolerancePercent: 0.01 })).toBe(false);
      expect(isWithinTolerance(10, 10.5, { tolerancePercent: 0.1 })).toBe(true);
    });

    it('should handle zero distances', () => {
      expect(isWithinTolerance(0, 0)).toBe(true);
      expect(isWithinTolerance(0, 0.01)).toBe(true); // Within absolute tolerance
    });
  });

  describe('estimateEffectiveDistance', () => {
    describe('when pace is not available', () => {
      it('should return recorded distance if available', () => {
        const result = estimateEffectiveDistance(1800, null, 5.0);
        expect(result.distance).toBe(5);
        expect(result.isEstimated).toBe(false);
      });

      it('should return 0 if no recorded distance', () => {
        const result = estimateEffectiveDistance(1800, null, null);
        expect(result.distance).toBe(0);
        expect(result.isEstimated).toBe(false);
      });
    });

    describe('when no recorded distance', () => {
      it('should estimate from pace', () => {
        // 30 min at 5:00/km = 6 km
        const result = estimateEffectiveDistance(1800, 300, null);
        expect(result.distance).toBe(6);
        expect(result.isEstimated).toBe(true);
      });
    });

    describe('when both are available', () => {
      it('should use recorded if within tolerance', () => {
        // 30 min at 5:00/km = 6 km theoretical
        const result = estimateEffectiveDistance(1800, 300, 6.1);
        expect(result.distance).toBe(6.1); // Use recorded
        expect(result.isEstimated).toBe(false);
        expect(result.wasAdjusted).toBe(false);
      });

      it('should use theoretical if outside tolerance', () => {
        // 30 min at 5:00/km = 6 km theoretical
        const result = estimateEffectiveDistance(1800, 300, 10);
        expect(result.distance).toBe(6);
        expect(result.isEstimated).toBe(true);
        expect(result.wasAdjusted).toBe(true);
      });
    });

    describe('alwaysEstimate option', () => {
      it('should always use theoretical when enabled', () => {
        const result = estimateEffectiveDistance(1800, 300, 6.1, { alwaysEstimate: true });
        expect(result.distance).toBe(6);
        expect(result.isEstimated).toBe(true);
      });
    });

    describe('precision option', () => {
      it('should respect precision setting', () => {
        // 33 min at 5:00/km = 6.6 km
        const result = estimateEffectiveDistance(1980, 300, null, { precision: 3 });
        expect(result.distance).toBe(6.6);
        // Verify it rounds to specified precision
        const result2 = estimateEffectiveDistance(1999, 300, null, { precision: 2 });
        expect(result2.distance).toBe(6.66);
      });
    });
  });

  describe('validateAndAdjustDistance', () => {
    it('should return original if pace matches distance', () => {
      // 60 min at 6:00/km = 10 km
      const result = validateAndAdjustDistance(60, 10, '6:00');
      expect(result).toBe(10);
    });

    it('should adjust distance if significantly off', () => {
      // 60 min at 6:00/km should be 10 km, not 8
      const result = validateAndAdjustDistance(60, 8, '6:00');
      expect(result).toBe(10);
    });

    it('should return original if within tolerance', () => {
      // 60 min at 6:00/km = 10 km
      // 10.3 is within 5% tolerance of 10
      const result = validateAndAdjustDistance(60, 10.3, '6:00');
      expect(result).toBe(10.3);
    });

    it('should return original for invalid pace format', () => {
      const result = validateAndAdjustDistance(60, 10, 'invalid');
      expect(result).toBe(10);
    });

    it('should handle zero pace', () => {
      const result = validateAndAdjustDistance(60, 10, '0:00');
      expect(result).toBe(10);
    });
  });
});
