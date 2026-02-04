import { describe, it, expect } from 'vitest';
import {
  buildSearchFilter,
  buildWorkoutsSearchFilter,
  buildPlanSessionsSearchFilter,
  buildDateFilter,
  buildSessionTypeFilter,
  combineFilters,
} from '../search.filter';

describe('search.filter', () => {
  describe('buildSearchFilter', () => {
    it('should return null for empty search', () => {
      expect(buildSearchFilter('')).toBeNull();
      expect(buildSearchFilter(null)).toBeNull();
      expect(buildSearchFilter(undefined)).toBeNull();
    });

    it('should return null for whitespace-only search', () => {
      expect(buildSearchFilter('   ')).toBeNull();
      expect(buildSearchFilter('\t')).toBeNull();
      expect(buildSearchFilter('\n')).toBeNull();
    });

    it('should return filter for valid search term', () => {
      const filter = buildSearchFilter('marathon');
      
      expect(filter).not.toBeNull();
      expect(filter?.OR).toHaveLength(2);
      expect(filter?.OR[0]).toEqual({
        comments: { contains: 'marathon', mode: 'insensitive' },
      });
      expect(filter?.OR[1]).toEqual({
        sessionType: { contains: 'marathon', mode: 'insensitive' },
      });
    });

    it('should trim whitespace from search term', () => {
      const filter = buildSearchFilter('  tempo run  ');
      
      expect(filter?.OR[0]).toEqual({
        comments: { contains: 'tempo run', mode: 'insensitive' },
      });
    });

    it('should preserve spaces within search term', () => {
      const filter = buildSearchFilter('long run');
      
      expect(filter?.OR[0].comments?.contains).toBe('long run');
    });
  });

  describe('buildWorkoutsSearchFilter', () => {
    it('should return null for empty search', () => {
      expect(buildWorkoutsSearchFilter('')).toBeNull();
    });

    it('should return filter compatible with workouts where input', () => {
      const filter = buildWorkoutsSearchFilter('test');
      
      expect(filter).not.toBeNull();
      expect(filter?.OR).toBeDefined();
    });
  });

  describe('buildPlanSessionsSearchFilter', () => {
    it('should return null for empty search', () => {
      expect(buildPlanSessionsSearchFilter('')).toBeNull();
    });

    it('should return filter compatible with plan_sessions where input', () => {
      const filter = buildPlanSessionsSearchFilter('test');
      
      expect(filter).not.toBeNull();
      expect(filter?.OR).toBeDefined();
    });
  });

  describe('buildDateFilter', () => {
    it('should return empty object for null dateFrom', () => {
      expect(buildDateFilter(null)).toEqual({});
      expect(buildDateFilter(undefined)).toEqual({});
    });

    it('should return empty object for empty string', () => {
      expect(buildDateFilter('')).toEqual({});
    });

    it('should return date filter for valid date', () => {
      const filter = buildDateFilter('2024-01-15');
      
      expect(filter.date).toBeDefined();
      expect(filter.date?.gte).toBeInstanceOf(Date);
      expect(filter.date?.gte.toISOString()).toContain('2024-01-15');
    });
  });

  describe('buildSessionTypeFilter', () => {
    it('should return empty object for null sessionType', () => {
      expect(buildSessionTypeFilter(null)).toEqual({});
      expect(buildSessionTypeFilter(undefined)).toEqual({});
    });

    it('should return empty object for "all"', () => {
      expect(buildSessionTypeFilter('all')).toEqual({});
    });

    it('should return filter for specific session type', () => {
      const filter = buildSessionTypeFilter('Endurance');
      
      expect(filter).toEqual({ sessionType: 'Endurance' });
    });
  });

  describe('combineFilters', () => {
    it('should combine multiple filters into one object', () => {
      const combined = combineFilters<Record<string, unknown>>(
        { userId: 'user1' },
        { sessionType: 'Endurance' },
        { date: { gte: new Date('2024-01-01') } }
      );
      
      expect(combined).toEqual({
        userId: 'user1',
        sessionType: 'Endurance',
        date: { gte: expect.any(Date) },
      });
    });

    it('should ignore null and undefined filters', () => {
      const combined = combineFilters<Record<string, unknown>>(
        { userId: 'user1' },
        null,
        undefined,
        { sessionType: 'Tempo' }
      );
      
      expect(combined).toEqual({
        userId: 'user1',
        sessionType: 'Tempo',
      });
    });

    it('should return empty object for no filters', () => {
      expect(combineFilters()).toEqual({});
    });

    it('should handle all null filters', () => {
      expect(combineFilters(null, undefined, null)).toEqual({});
    });

    it('should override earlier properties with later ones', () => {
      const combined = combineFilters<Record<string, unknown>>(
        { sessionType: 'Endurance' },
        { sessionType: 'Tempo' }
      );
      
      expect(combined.sessionType).toBe('Tempo');
    });
  });
});
