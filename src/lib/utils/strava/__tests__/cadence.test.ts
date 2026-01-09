import { describe, it, expect } from 'vitest';
import { stravaCadenceToFull, formatCadence, formatCadenceWithUnit } from '../cadence';

describe('cadence utilities', () => {
  describe('stravaCadenceToFull', () => {
    it('should double the cadence value', () => {
      expect(stravaCadenceToFull(75)).toBe(150);
      expect(stravaCadenceToFull(80)).toBe(160);
      expect(stravaCadenceToFull(90)).toBe(180);
    });

    it('should handle zero', () => {
      expect(stravaCadenceToFull(0)).toBe(0);
    });
  });

  describe('formatCadence', () => {
    it('should format and round cadence correctly', () => {
      expect(formatCadence(75)).toBe('150');
      expect(formatCadence(80.5)).toBe('161');
      expect(formatCadence(89.7)).toBe('179');
    });
  });

  describe('formatCadenceWithUnit', () => {
    it('should format cadence with unit', () => {
      expect(formatCadenceWithUnit(75)).toBe('150 ppm');
      expect(formatCadenceWithUnit(80)).toBe('160 ppm');
    });
  });
});
