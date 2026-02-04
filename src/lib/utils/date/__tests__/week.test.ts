import { describe, it, expect } from 'vitest';
import {
  getISOWeekKey,
  getISOWeekNumber,
  getISOWeekYear,
  getISOWeekStart,
  getISOWeekEnd,
} from '../week';

describe('week utilities', () => {
  describe('getISOWeekKey', () => {
    it('should return correct week key for a regular date', () => {
      // Wednesday, January 10, 2024
      const date = new Date(2024, 0, 10);
      expect(getISOWeekKey(date)).toBe('2024-W02');
    });

    it('should return correct week key for first week of year', () => {
      // Monday, January 1, 2024 is in week 1
      const date = new Date(2024, 0, 1);
      expect(getISOWeekKey(date)).toBe('2024-W01');
    });

    it('should handle year boundary - Dec 31 may be in week 1 of next year', () => {
      // December 31, 2024 is a Tuesday, should be in week 1 of 2025
      const date = new Date(2024, 11, 31);
      expect(getISOWeekKey(date)).toBe('2025-W01');
    });

    it('should handle year boundary - Jan 1 may be in last week of previous year', () => {
      // January 1, 2023 is a Sunday, should be in week 52 of 2022
      const date = new Date(2023, 0, 1);
      expect(getISOWeekKey(date)).toBe('2022-W52');
    });

    it('should return padded week number', () => {
      const date = new Date(2024, 0, 3);
      const weekKey = getISOWeekKey(date);
      expect(weekKey).toMatch(/\d{4}-W\d{2}/);
    });

    it('should handle week 53 in years that have it', () => {
      // 2020 has 53 weeks, Dec 31, 2020 is Thursday
      const date = new Date(2020, 11, 31);
      expect(getISOWeekKey(date)).toBe('2020-W53');
    });
  });

  describe('getISOWeekNumber', () => {
    it('should return just the week number', () => {
      const date = new Date(2024, 0, 10);
      expect(getISOWeekNumber(date)).toBe(2);
    });

    it('should return week 1 for first week', () => {
      const date = new Date(2024, 0, 1);
      expect(getISOWeekNumber(date)).toBe(1);
    });

    it('should return 53 for week 53', () => {
      const date = new Date(2020, 11, 31);
      expect(getISOWeekNumber(date)).toBe(53);
    });
  });

  describe('getISOWeekYear', () => {
    it('should return correct year for regular date', () => {
      const date = new Date(2024, 5, 15);
      expect(getISOWeekYear(date)).toBe(2024);
    });

    it('should return next year when Dec 31 is in week 1', () => {
      const date = new Date(2024, 11, 31);
      expect(getISOWeekYear(date)).toBe(2025);
    });

    it('should return previous year when Jan 1 is in last week', () => {
      const date = new Date(2023, 0, 1);
      expect(getISOWeekYear(date)).toBe(2022);
    });
  });

  describe('getISOWeekStart', () => {
    it('should return Monday of the week', () => {
      // Wednesday, January 10, 2024
      const date = new Date(2024, 0, 10);
      const start = getISOWeekStart(date);
      
      expect(start.getDay()).toBe(1); // Monday
      expect(start.getDate()).toBe(8); // January 8
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });

    it('should return same day if already Monday', () => {
      // Monday, January 8, 2024
      const date = new Date(2024, 0, 8);
      const start = getISOWeekStart(date);
      
      expect(start.getDate()).toBe(8);
    });

    it('should handle Sunday correctly', () => {
      // Sunday, January 14, 2024
      const date = new Date(2024, 0, 14);
      const start = getISOWeekStart(date);
      
      expect(start.getDay()).toBe(1);
      expect(start.getDate()).toBe(8); // Previous Monday
    });
  });

  describe('getISOWeekEnd', () => {
    it('should return Sunday at end of day', () => {
      const date = new Date(2024, 0, 10);
      const end = getISOWeekEnd(date);
      
      expect(end.getDay()).toBe(0); // Sunday
      expect(end.getDate()).toBe(14);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it('should return same Sunday if already Sunday', () => {
      const date = new Date(2024, 0, 14);
      const end = getISOWeekEnd(date);
      
      expect(end.getDate()).toBe(14);
    });
  });
});
