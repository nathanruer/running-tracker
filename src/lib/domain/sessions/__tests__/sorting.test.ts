import { describe, it, expect } from 'vitest';
import {
  parseSortParam,
  serializeSortConfig,
  getColumnSortInfo,
  toggleColumnSort,
  getClientSortValue,
  compareValues,
  SORTABLE_COLUMNS,
  type SortConfig,
} from '../sorting';

describe('sorting', () => {
  describe('SORTABLE_COLUMNS', () => {
    it('should have a transform function for duration that converts minutes to seconds', () => {
      const durationConfig = SORTABLE_COLUMNS.duration;
      expect(durationConfig.transform).toBeDefined();
      // 45 minutes should become 2700 seconds
      expect(durationConfig.transform!(45)).toBe(2700);
    });
  });

  describe('parseSortParam', () => {
    it('should return empty array for null param', () => {
      expect(parseSortParam(null)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseSortParam('')).toEqual([]);
    });

    it('should parse single column with direction', () => {
      expect(parseSortParam('date:desc')).toEqual([
        { column: 'date', direction: 'desc' },
      ]);
    });

    it('should parse single column without direction (defaults to desc)', () => {
      expect(parseSortParam('distance')).toEqual([
        { column: 'distance', direction: 'desc' },
      ]);
    });

    it('should parse multiple columns', () => {
      expect(parseSortParam('date:desc,distance:asc')).toEqual([
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'asc' },
      ]);
    });

    it('should ignore invalid columns', () => {
      expect(parseSortParam('invalidColumn:desc,date:asc')).toEqual([
        { column: 'date', direction: 'asc' },
      ]);
    });

    it('should ignore invalid directions', () => {
      expect(parseSortParam('date:invalid')).toEqual([]);
    });

    it('should ignore duplicate columns', () => {
      expect(parseSortParam('date:desc,date:asc')).toEqual([
        { column: 'date', direction: 'desc' },
      ]);
    });

    it('should handle whitespace', () => {
      expect(parseSortParam(' date : desc , distance : asc ')).toEqual([
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'asc' },
      ]);
    });
  });

  describe('serializeSortConfig', () => {
    it('should return empty string for empty config', () => {
      expect(serializeSortConfig([])).toBe('');
    });

    it('should serialize single column', () => {
      expect(serializeSortConfig([{ column: 'date', direction: 'desc' }])).toBe(
        'date:desc'
      );
    });

    it('should serialize multiple columns', () => {
      const config: SortConfig = [
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'asc' },
      ];
      expect(serializeSortConfig(config)).toBe('date:desc,distance:asc');
    });
  });

  describe('getColumnSortInfo', () => {
    it('should return null for column not in config', () => {
      const config: SortConfig = [{ column: 'date', direction: 'desc' }];
      expect(getColumnSortInfo(config, 'distance')).toBeNull();
    });

    it('should return position and direction for column in config', () => {
      const config: SortConfig = [
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'asc' },
      ];
      expect(getColumnSortInfo(config, 'distance')).toEqual({
        position: 2,
        direction: 'asc',
      });
    });

    it('should return position 1 for first column', () => {
      const config: SortConfig = [{ column: 'date', direction: 'desc' }];
      expect(getColumnSortInfo(config, 'date')).toEqual({
        position: 1,
        direction: 'desc',
      });
    });
  });

  describe('toggleColumnSort', () => {
    describe('single sort mode (isMultiSort = false)', () => {
      it('should add column with desc direction when not present', () => {
        expect(toggleColumnSort([], 'date', false)).toEqual([
          { column: 'date', direction: 'desc' },
        ]);
      });

      it('should toggle from desc to asc when clicking same column', () => {
        const config: SortConfig = [{ column: 'date', direction: 'desc' }];
        expect(toggleColumnSort(config, 'date', false)).toEqual([
          { column: 'date', direction: 'asc' },
        ]);
      });

      it('should clear sort when clicking same column with asc', () => {
        const config: SortConfig = [{ column: 'date', direction: 'asc' }];
        expect(toggleColumnSort(config, 'date', false)).toEqual([]);
      });

      it('should replace existing sort with new column', () => {
        const config: SortConfig = [{ column: 'date', direction: 'desc' }];
        expect(toggleColumnSort(config, 'distance', false)).toEqual([
          { column: 'distance', direction: 'desc' },
        ]);
      });
    });

    describe('multi sort mode (isMultiSort = true)', () => {
      it('should add column to existing sort', () => {
        const config: SortConfig = [{ column: 'date', direction: 'desc' }];
        expect(toggleColumnSort(config, 'distance', true)).toEqual([
          { column: 'date', direction: 'desc' },
          { column: 'distance', direction: 'desc' },
        ]);
      });

      it('should toggle direction of existing column', () => {
        const config: SortConfig = [
          { column: 'date', direction: 'desc' },
          { column: 'distance', direction: 'desc' },
        ];
        expect(toggleColumnSort(config, 'distance', true)).toEqual([
          { column: 'date', direction: 'desc' },
          { column: 'distance', direction: 'asc' },
        ]);
      });

      it('should remove column when clicking asc column in multi-sort', () => {
        const config: SortConfig = [
          { column: 'date', direction: 'desc' },
          { column: 'distance', direction: 'asc' },
        ];
        expect(toggleColumnSort(config, 'distance', true)).toEqual([
          { column: 'date', direction: 'desc' },
        ]);
      });
    });
  });

  describe('getClientSortValue', () => {
    it('should return sessionNumber for completed session', () => {
      const session = { status: 'completed', sessionNumber: 5 };
      expect(getClientSortValue(session, 'sessionNumber')).toBe(5);
    });

    it('should return null for null sessionNumber', () => {
      const session = { status: 'completed', sessionNumber: null };
      expect(getClientSortValue(session, 'sessionNumber')).toBeNull();
    });

    it('should return week for session', () => {
      const session = { status: 'completed', week: 3 };
      expect(getClientSortValue(session, 'week')).toBe(3);
    });

    it('should return null for null week', () => {
      const session = { status: 'completed', week: null };
      expect(getClientSortValue(session, 'week')).toBeNull();
    });

    it('should return date as timestamp', () => {
      const session = { status: 'completed', date: '2024-01-15' };
      const expected = new Date('2024-01-15').getTime();
      expect(getClientSortValue(session, 'date')).toBe(expected);
    });

    it('should return null for null date', () => {
      const session = { status: 'completed', date: null };
      expect(getClientSortValue(session, 'date')).toBeNull();
    });

    it('should return distance for completed session', () => {
      const session = { status: 'completed', distance: 10.5 };
      expect(getClientSortValue(session, 'distance')).toBe(10.5);
    });

    it('should return targetDistance for planned session', () => {
      const session = { status: 'planned', distance: null, targetDistance: 8 };
      expect(getClientSortValue(session, 'distance')).toBe(8);
    });

    it('should return duration in seconds for completed session', () => {
      const session = { status: 'completed', duration: '01:30:00' };
      expect(getClientSortValue(session, 'duration')).toBe(5400);
    });

    it('should return targetDuration in seconds for planned session', () => {
      const session = { status: 'planned', duration: null, targetDuration: 45 };
      expect(getClientSortValue(session, 'duration')).toBe(2700);
    });

    it('should return null for planned session with no targetDuration', () => {
      const session = { status: 'planned', duration: null, targetDuration: null };
      expect(getClientSortValue(session, 'duration')).toBeNull();
    });

    it('should return lowercase sessionType', () => {
      const session = { sessionType: 'Endurance' };
      expect(getClientSortValue(session, 'sessionType')).toBe('endurance');
    });

    it('should return null for undefined sessionType', () => {
      const session = { status: 'completed' };
      expect(getClientSortValue(session, 'sessionType')).toBeNull();
    });

    it('should return avgPace for completed session', () => {
      const session = { status: 'completed', avgPace: '5:30' };
      expect(getClientSortValue(session, 'avgPace')).toBe(330);
    });

    it('should return targetPace for planned session', () => {
      const session = { status: 'planned', avgPace: null, targetPace: '6:00' };
      expect(getClientSortValue(session, 'avgPace')).toBe(360);
    });

    it('should return avgHeartRate for completed session', () => {
      const session = { status: 'completed', avgHeartRate: 150 };
      expect(getClientSortValue(session, 'avgHeartRate')).toBe(150);
    });

    it('should return null for completed session with no avgHeartRate', () => {
      const session = { status: 'completed', avgHeartRate: null };
      expect(getClientSortValue(session, 'avgHeartRate')).toBeNull();
    });

    it('should return targetHeartRateBpm for planned session', () => {
      const session = { status: 'planned', avgHeartRate: null, targetHeartRateBpm: 145 };
      expect(getClientSortValue(session, 'avgHeartRate')).toBe(145);
    });

    it('should return targetHeartRateBpm as string for planned session', () => {
      // parseFloat('140-150') returns 140, not the average
      const session = { status: 'planned', avgHeartRate: null, targetHeartRateBpm: '140-150' };
      expect(getClientSortValue(session, 'avgHeartRate')).toBe(140);
    });

    it('should return perceivedExertion for completed session', () => {
      const session = { status: 'completed', perceivedExertion: 7 };
      expect(getClientSortValue(session, 'perceivedExertion')).toBe(7);
    });

    it('should return targetRPE for planned session', () => {
      const session = { status: 'planned', perceivedExertion: null, targetRPE: 6 };
      expect(getClientSortValue(session, 'perceivedExertion')).toBe(6);
    });

    it('should return null for planned session with no targetRPE', () => {
      const session = { status: 'planned', perceivedExertion: null, targetRPE: null };
      expect(getClientSortValue(session, 'perceivedExertion')).toBeNull();
    });
  });

  describe('compareValues', () => {
    it('should return 0 for equal values', () => {
      expect(compareValues(5, 5, 'asc')).toBe(0);
    });

    it('should sort ascending correctly', () => {
      expect(compareValues(3, 5, 'asc')).toBe(-1);
      expect(compareValues(5, 3, 'asc')).toBe(1);
    });

    it('should sort descending correctly', () => {
      expect(compareValues(3, 5, 'desc')).toBe(1);
      expect(compareValues(5, 3, 'desc')).toBe(-1);
    });

    it('should handle null values (nulls last)', () => {
      expect(compareValues(null, 5, 'asc')).toBe(1);
      expect(compareValues(5, null, 'asc')).toBe(-1);
      expect(compareValues(null, null, 'asc')).toBe(0);
    });

    it('should handle inverted direction for pace', () => {
      expect(compareValues(300, 360, 'desc', true)).toBe(-1);
      expect(compareValues(360, 300, 'desc', true)).toBe(1);
    });

    it('should compare strings correctly', () => {
      expect(compareValues('apple', 'banana', 'asc')).toBe(-1);
      expect(compareValues('banana', 'apple', 'asc')).toBe(1);
    });
  });
});
