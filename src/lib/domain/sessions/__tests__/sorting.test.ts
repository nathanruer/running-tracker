import { describe, it, expect } from 'vitest';
import {
  parseSortParam,
  serializeSortConfig,
  getColumnSortInfo,
  toggleColumnSort,
  getClientSortValue,
  compareValues,
} from '../sorting';
import type { SortConfig } from '../sorting';

const plannedSession = {
  status: 'planned',
  targetDuration: 50,
  targetDistance: 12.3,
  targetPace: '05:00',
  targetHeartRateBpm: '150',
  targetRPE: 5,
  sessionNumber: 2,
  week: 3,
  date: '2026-01-05',
  sessionType: 'Tempo',
};

const completedSession = {
  status: 'completed',
  duration: '00:45:00',
  distance: 10,
  avgPace: '04:30',
  avgHeartRate: 155,
  perceivedExertion: 7,
  sessionNumber: 1,
  week: 2,
  date: '2026-01-04',
  sessionType: 'Easy',
};

describe('sessions sorting helpers', () => {
  describe('parseSortParam', () => {
    it('returns empty config for null or empty input', () => {
      expect(parseSortParam(null)).toEqual([]);
      expect(parseSortParam('')).toEqual([]);
      expect(parseSortParam('   ')).toEqual([]);
    });

    it('parses valid columns with default direction', () => {
      expect(parseSortParam('date')).toEqual([{ column: 'date', direction: 'desc' }]);
      expect(parseSortParam('week:asc')).toEqual([{ column: 'week', direction: 'asc' }]);
    });

    it('ignores invalid entries and duplicates', () => {
      const result = parseSortParam('date:asc,unknown:asc,week:down, date:desc , week:desc');
      expect(result).toEqual([
        { column: 'date', direction: 'asc' },
        { column: 'week', direction: 'desc' },
      ]);
    });

    it('trims whitespace around columns and directions', () => {
      expect(parseSortParam('  sessionType : asc  ')).toEqual([
        { column: 'sessionType', direction: 'asc' },
      ]);
    });
  });

  describe('serializeSortConfig', () => {
    it('serializes empty config to empty string', () => {
      expect(serializeSortConfig([])).toBe('');
    });

    it('serializes config to a comma-separated string', () => {
      expect(
        serializeSortConfig([
          { column: 'date', direction: 'asc' },
          { column: 'duration', direction: 'desc' },
        ])
      ).toBe('date:asc,duration:desc');
    });
  });

  describe('getColumnSortInfo', () => {
    it('returns sort info for a column', () => {
      const info = getColumnSortInfo(
        [
          { column: 'date', direction: 'asc' },
          { column: 'distance', direction: 'desc' },
        ],
        'distance'
      );

      expect(info).toEqual({ position: 2, direction: 'desc' });
    });

    it('returns null when column is not in config', () => {
      expect(getColumnSortInfo([{ column: 'date', direction: 'asc' }], 'week')).toBeNull();
    });
  });

  describe('toggleColumnSort', () => {
    it('adds a column in multi-sort mode', () => {
      expect(toggleColumnSort([], 'date', true)).toEqual([
        { column: 'date', direction: 'desc' },
      ]);
    });

    it('cycles through desc -> asc -> remove in multi-sort mode', () => {
      const initial: SortConfig = [
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'asc' },
      ];

      const ascConfig = toggleColumnSort(initial, 'date', true);
      expect(ascConfig).toEqual([
        { column: 'date', direction: 'asc' },
        { column: 'distance', direction: 'asc' },
      ]);

      const removed = toggleColumnSort(ascConfig, 'date', true);
      expect(removed).toEqual([{ column: 'distance', direction: 'asc' }]);
    });

    it('replaces config in single-sort mode', () => {
      expect(toggleColumnSort([], 'week', false)).toEqual([
        { column: 'week', direction: 'desc' },
      ]);

      expect(toggleColumnSort([{ column: 'week', direction: 'desc' }], 'week', false)).toEqual([
        { column: 'week', direction: 'asc' },
      ]);

      expect(toggleColumnSort([{ column: 'week', direction: 'asc' }], 'week', false)).toEqual([]);
    });
  });

  describe('getClientSortValue', () => {
    it('returns values for planned sessions', () => {
      expect(getClientSortValue(plannedSession, 'duration')).toBe(3000);
      expect(getClientSortValue(plannedSession, 'distance')).toBe(12.3);
      expect(getClientSortValue(plannedSession, 'avgPace')).toBe(300);
      expect(getClientSortValue(plannedSession, 'avgHeartRate')).toBe(150);
      expect(getClientSortValue(plannedSession, 'perceivedExertion')).toBe(5);
      expect(getClientSortValue(plannedSession, 'sessionNumber')).toBe(2);
      expect(getClientSortValue(plannedSession, 'week')).toBe(3);
      expect(getClientSortValue(plannedSession, 'sessionType')).toBe('tempo');
      expect(getClientSortValue(plannedSession, 'date')).toBe(new Date('2026-01-05').getTime());
    });

    it('returns values for completed sessions', () => {
      expect(getClientSortValue(completedSession, 'duration')).toBe(2700);
      expect(getClientSortValue(completedSession, 'distance')).toBe(10);
      expect(getClientSortValue(completedSession, 'avgPace')).toBe(270);
      expect(getClientSortValue(completedSession, 'avgHeartRate')).toBe(155);
      expect(getClientSortValue(completedSession, 'perceivedExertion')).toBe(7);
      expect(getClientSortValue(completedSession, 'sessionNumber')).toBe(1);
      expect(getClientSortValue(completedSession, 'week')).toBe(2);
      expect(getClientSortValue(completedSession, 'sessionType')).toBe('easy');
      expect(getClientSortValue(completedSession, 'date')).toBe(new Date('2026-01-04').getTime());
    });
  });

  describe('compareValues', () => {
    it('handles null cases', () => {
      expect(compareValues(null, null, 'asc')).toBe(0);
      expect(compareValues(null, 1, 'asc')).toBe(1);
      expect(compareValues(1, null, 'asc')).toBe(-1);
    });

    it('compares values with direction and inversion', () => {
      expect(compareValues(1, 2, 'asc')).toBe(-1);
      expect(compareValues(1, 2, 'desc')).toBe(1);
      expect(compareValues(1, 2, 'asc', true)).toBe(1);
      expect(compareValues('b', 'a', 'asc')).toBe(1);
      expect(compareValues('b', 'a', 'desc')).toBe(-1);
    });
  });
});
