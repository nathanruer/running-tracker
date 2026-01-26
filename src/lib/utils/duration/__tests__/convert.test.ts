import { describe, it, expect } from 'vitest';
import { convertDurationToMinutes } from '../convert';

describe('convertDurationToMinutes', () => {
  describe('HH:MM:SS format', () => {
    it('should convert 01:30:00 to 90 minutes', () => {
      expect(convertDurationToMinutes('01:30:00')).toBe(90);
    });

    it('should convert 02:00:00 to 120 minutes', () => {
      expect(convertDurationToMinutes('02:00:00')).toBe(120);
    });

    it('should convert 00:45:00 to 45 minutes', () => {
      expect(convertDurationToMinutes('00:45:00')).toBe(45);
    });

    it('should round 00:00:30 to 1 minute', () => {
      expect(convertDurationToMinutes('00:00:30')).toBe(1);
    });

    it('should round 00:00:29 to 0 minutes', () => {
      expect(convertDurationToMinutes('00:00:29')).toBe(0);
    });
  });

  describe('MM:SS format', () => {
    it('should convert 45:00 to 45 minutes', () => {
      expect(convertDurationToMinutes('45:00')).toBe(45);
    });

    it('should convert 30:00 to 30 minutes', () => {
      expect(convertDurationToMinutes('30:00')).toBe(30);
    });

    it('should convert 00:30 to 1 minute (rounded)', () => {
      expect(convertDurationToMinutes('00:30')).toBe(1);
    });

    it('should convert 10:30 to 11 minutes (rounded)', () => {
      expect(convertDurationToMinutes('10:30')).toBe(11);
    });
  });

  describe('invalid formats', () => {
    it('should return 0 for invalid string', () => {
      expect(convertDurationToMinutes('invalid')).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(convertDurationToMinutes('')).toBe(0);
    });

    it('should return 0 for malformed duration', () => {
      expect(convertDurationToMinutes('abc:def')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle 00:00:00', () => {
      expect(convertDurationToMinutes('00:00:00')).toBe(0);
    });

    it('should handle large durations', () => {
      expect(convertDurationToMinutes('10:00:00')).toBe(600);
    });
  });
});
