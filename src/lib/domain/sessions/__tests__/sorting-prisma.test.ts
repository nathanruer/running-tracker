import { describe, it, expect } from 'vitest';
import {
  buildPrismaOrderBy,
  buildRawOrderByClause,
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
});
