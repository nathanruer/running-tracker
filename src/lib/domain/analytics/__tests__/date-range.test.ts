import { describe, it, expect } from 'vitest';
import {
  parseDateInput,
  resolveDateRange,
  isCustomRangeTooShort,
  filterItemsByRange,
  isDateInRange,
} from '../date-range';

describe('date-range', () => {
  describe('parseDateInput', () => {
    it('parses date-only input to start of day', () => {
      const result = parseDateInput('2026-01-05');
      expect(result).not.toBeNull();
      expect(result?.getTime()).toBe(new Date(2026, 0, 5, 0, 0, 0, 0).getTime());
    });

    it('parses ISO input with time to start of day', () => {
      const result = parseDateInput('2026-01-05T10:30:00');
      expect(result).not.toBeNull();
      expect(result?.getTime()).toBe(new Date(2026, 0, 5, 0, 0, 0, 0).getTime());
    });

    it('returns null for invalid input', () => {
      expect(parseDateInput('not-a-date')).toBeNull();
      expect(parseDateInput(undefined)).toBeNull();
      expect(parseDateInput(null)).toBeNull();
    });
  });

  describe('resolveDateRange', () => {
    it('resolves "all" range using earliest session date', () => {
      const result = resolveDateRange({
        dateRange: 'all',
        sessionDates: ['2026-01-10', '2026-01-05'],
        referenceDate: new Date(2026, 1, 15, 12, 0, 0, 0),
      });

      expect(result.start?.getTime()).toBe(new Date(2026, 0, 5, 0, 0, 0, 0).getTime());
      expect(result.end?.getTime()).toBe(new Date(2026, 1, 15, 23, 59, 59, 999).getTime());
      expect(result.label).not.toBe('Aucune donnée');
    });

    it('resolves custom range using provided dates', () => {
      const result = resolveDateRange({
        dateRange: 'custom',
        customStartDate: '2026-01-02',
        customEndDate: '2026-01-20',
        referenceDate: new Date(2026, 1, 15, 12, 0, 0, 0),
      });

      expect(result.start?.getTime()).toBe(new Date(2026, 0, 2, 0, 0, 0, 0).getTime());
      expect(result.end?.getTime()).toBe(new Date(2026, 0, 20, 23, 59, 59, 999).getTime());
    });
  });

  describe('isCustomRangeTooShort', () => {
    it('returns true when range is shorter than minimum', () => {
      expect(isCustomRangeTooShort('2026-01-01', '2026-01-10')).toBe(true);
    });

    it('returns false when range meets minimum length', () => {
      expect(isCustomRangeTooShort('2026-01-01', '2026-01-14')).toBe(false);
    });
  });

  describe('isDateInRange', () => {
    it('handles open ranges and inclusive bounds', () => {
      const start = new Date(2026, 0, 1, 0, 0, 0, 0);
      const end = new Date(2026, 0, 31, 23, 59, 59, 999);

      expect(isDateInRange(new Date(2026, 0, 1, 0, 0, 0, 0), start, end)).toBe(true);
      expect(isDateInRange(new Date(2026, 0, 31, 23, 59, 59, 999), start, end)).toBe(true);
      expect(isDateInRange(new Date(2026, 1, 1, 0, 0, 0, 0), start, end)).toBe(false);
      expect(isDateInRange(new Date(2026, 0, 15, 0, 0, 0, 0), null, null)).toBe(true);
      expect(isDateInRange(new Date(2026, 0, 15, 0, 0, 0, 0), start, null)).toBe(true);
      expect(isDateInRange(new Date(2025, 11, 31, 0, 0, 0, 0), start, null)).toBe(false);
      expect(isDateInRange(new Date(2026, 1, 1, 0, 0, 0, 0), null, end)).toBe(false);
    });
  });

  describe('filterItemsByRange', () => {
    it('filters items based on parsed dates', () => {
      const items = [
        { date: '2026-01-05', id: 'a' },
        { date: '2026-01-20', id: 'b' },
        { date: null, id: 'c' },
      ];

      const start = new Date(2026, 0, 1, 0, 0, 0, 0);
      const end = new Date(2026, 0, 10, 23, 59, 59, 999);

      const result = filterItemsByRange(items, (item) => item.date, start, end);

      expect(result.map((item) => item.id)).toEqual(['a']);
    });
  });
});
