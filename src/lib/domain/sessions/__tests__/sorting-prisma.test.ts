import { describe, it, expect } from 'vitest';
import {
  buildPrismaOrderBy,
  buildRawOrderByClause,
  getSortedSessionsQuery,
  isSimpleSortConfig,
} from '../sorting-prisma';
import type { SortConfig } from '../sorting';

describe('sorting-prisma', () => {
  describe('buildPrismaOrderBy', () => {
    it('should return default order for empty config', () => {
      const result = buildPrismaOrderBy([]);
      expect(result).toEqual([{ status: 'desc' }, { sessionNumber: 'desc' }]);
    });

    it('should build orderBy for single column', () => {
      const config: SortConfig = [{ column: 'date', direction: 'desc' }];
      const result = buildPrismaOrderBy(config);
      expect(result).toEqual([
        { date: { sort: 'desc', nulls: 'last' } },
      ]);
    });

    it('should build orderBy for multiple columns', () => {
      const config: SortConfig = [
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'asc' },
      ];
      const result = buildPrismaOrderBy(config);
      expect(result).toHaveLength(2);
    });

    it('should invert direction for avgPace column', () => {
      const config: SortConfig = [{ column: 'avgPace', direction: 'desc' }];
      const result = buildPrismaOrderBy(config);
      expect(result[0]).toEqual({
        avgPace: { sort: 'asc', nulls: 'last' },
      });
    });
  });

  describe('buildRawOrderByClause', () => {
    it('should return default ORDER BY for empty config', () => {
      const result = buildRawOrderByClause([]);
      expect(result).toBe('ORDER BY "status" DESC, "sessionNumber" DESC');
    });

    it('should build simple ORDER BY for non-coalesce columns', () => {
      const config: SortConfig = [{ column: 'date', direction: 'desc' }];
      const result = buildRawOrderByClause(config);
      expect(result).toBe('ORDER BY "date" DESC NULLS LAST');
    });

    it('should build COALESCE ORDER BY for distance', () => {
      const config: SortConfig = [{ column: 'distance', direction: 'asc' }];
      const result = buildRawOrderByClause(config);
      expect(result).toContain('COALESCE');
      expect(result).toContain('"distance"');
      expect(result).toContain('"targetDistance"');
    });

    it('should build COALESCE ORDER BY for perceivedExertion', () => {
      const config: SortConfig = [{ column: 'perceivedExertion', direction: 'desc' }];
      const result = buildRawOrderByClause(config);
      expect(result).toContain('COALESCE');
      expect(result).toContain('"perceivedExertion"');
      expect(result).toContain('"targetRPE"');
    });

    it('should handle multiple columns', () => {
      const config: SortConfig = [
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'asc' },
      ];
      const result = buildRawOrderByClause(config);
      expect(result).toContain('ORDER BY');
      expect(result).toContain('"date" DESC NULLS LAST');
      expect(result).toContain('COALESCE');
    });

    it('should invert direction for avgPace', () => {
      const config: SortConfig = [{ column: 'avgPace', direction: 'desc' }];
      const result = buildRawOrderByClause(config);
      expect(result).toContain('ASC NULLS LAST');
    });

    it('should build duration order by using interval extraction', () => {
      const config: SortConfig = [{ column: 'duration', direction: 'asc' }];
      const result = buildRawOrderByClause(config);
      expect(result).toContain('EXTRACT(EPOCH FROM "duration"::interval)');
      expect(result).toContain('"targetDuration" * 60');
    });

    it('should build avgHeartRate order by casting target', () => {
      const config: SortConfig = [{ column: 'avgHeartRate', direction: 'asc' }];
      const result = buildRawOrderByClause(config);
      expect(result).toContain('"avgHeartRate"');
      expect(result).toContain('"targetHeartRateBpm"::integer');
    });
  });

  describe('isSimpleSortConfig', () => {
    it('should return true for empty config', () => {
      expect(isSimpleSortConfig([])).toBe(true);
    });

    it('should return true for simple columns without coalesce', () => {
      const config: SortConfig = [
        { column: 'date', direction: 'desc' },
        { column: 'sessionType', direction: 'asc' },
      ];
      expect(isSimpleSortConfig(config)).toBe(true);
    });

    it('should return false for columns with coalesce', () => {
      const config: SortConfig = [{ column: 'distance', direction: 'desc' }];
      expect(isSimpleSortConfig(config)).toBe(false);
    });

    it('should return false for mixed columns', () => {
      const config: SortConfig = [
        { column: 'date', direction: 'desc' },
        { column: 'distance', direction: 'asc' },
      ];
      expect(isSimpleSortConfig(config)).toBe(false);
    });
  });

  describe('getSortedSessionsQuery', () => {
    it('should include filters and pagination when provided', () => {
      const query = getSortedSessionsQuery(
        'user-1',
        [{ column: 'duration', direction: 'asc' }],
        { status: 'completed', sessionType: 'Footing', limit: 10, offset: 20 }
      );

      const sql = query.strings.join('');

      expect(sql).toContain('"userId" = \'user-1\'');
      expect(sql).toContain('"status" = \'completed\'');
      expect(sql).toContain('"sessionType" = \'Footing\'');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT 10');
      expect(sql).toContain('OFFSET 20');
    });

    it('should skip all filters and pagination when not provided', () => {
      const query = getSortedSessionsQuery(
        'user-1',
        [],
        { status: 'all', sessionType: 'all' }
      );

      const sql = query.strings.join('');

      expect(sql).toContain('"userId" = \'user-1\'');
      expect(sql).not.toContain('"status" =');
      expect(sql).not.toContain('"sessionType" =');
      expect(sql).toContain('ORDER BY "status" DESC, "sessionNumber" DESC');
    });

    it('should include limit without offset when offset is missing', () => {
      const query = getSortedSessionsQuery(
        'user-1',
        [{ column: 'distance', direction: 'desc' }],
        { limit: 5 }
      );

      const sql = query.strings.join('');

      expect(sql).toContain('LIMIT 5');
      expect(sql).not.toContain('OFFSET');
    });
  });
});
