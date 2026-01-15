import { describe, it, expect } from 'vitest';
import { parseDuration, validateDurationInput } from '../parse';

describe('parseDuration', () => {
  describe('MM:SS format', () => {
    it('should parse valid MM:SS format', () => {
      expect(parseDuration('48:30')).toBe(2910); // 48 * 60 + 30
      expect(parseDuration('05:30')).toBe(330); // 5 * 60 + 30
      expect(parseDuration('00:30')).toBe(30);
      expect(parseDuration('120:00')).toBe(7200); // 120 minutes
    });

    it('should handle single digit parts', () => {
      expect(parseDuration('5:5')).toBe(305); // 5 * 60 + 5
      expect(parseDuration('0:30')).toBe(30);
    });
  });

  describe('HH:MM:SS format', () => {
    it('should parse valid HH:MM:SS format', () => {
      expect(parseDuration('00:48:30')).toBe(2910); // 48 * 60 + 30
      expect(parseDuration('01:30:00')).toBe(5400); // 1 * 3600 + 30 * 60
      expect(parseDuration('02:15:45')).toBe(8145); // 2 * 3600 + 15 * 60 + 45
    });

    it('should handle single digit parts', () => {
      expect(parseDuration('1:5:5')).toBe(3905); // 1 * 3600 + 5 * 60 + 5
    });
  });

  describe('Invalid inputs', () => {
    it('should return null for invalid formats', () => {
      expect(parseDuration('invalid')).toBe(null);
      expect(parseDuration('12')).toBe(null);
      expect(parseDuration('12:34:56:78')).toBe(null);
      expect(parseDuration('')).toBe(null);
    });

    it('should return null for invalid values', () => {
      expect(parseDuration('12:60')).toBe(null);
      expect(parseDuration('00:12:60')).toBe(null);
      expect(parseDuration('00:60:00')).toBe(null);
      expect(parseDuration('-5:30')).toBe(null);
    });

    it('should return null for non-numeric parts', () => {
      expect(parseDuration('abc:def')).toBe(null);
      expect(parseDuration('12:ab')).toBe(null);
      expect(parseDuration('ab:12:34')).toBe(null);
    });

    it('should handle edge cases', () => {
      expect(parseDuration(null as unknown as string)).toBe(null);
      expect(parseDuration(undefined as unknown as string)).toBe(null);
      expect(parseDuration(123 as unknown as string)).toBe(null);
    });
  });
});

describe('validateDurationInput', () => {
  it('should validate correct MM:SS format', () => {
    expect(validateDurationInput('48:30')).toBe(true);
    expect(validateDurationInput('05:30')).toBe(true);
    expect(validateDurationInput('5:30')).toBe(true);
    expect(validateDurationInput('00:30')).toBe(true);
  });

  it('should validate correct HH:MM:SS format', () => {
    expect(validateDurationInput('00:48:30')).toBe(true);
    expect(validateDurationInput('01:30:00')).toBe(true);
    expect(validateDurationInput('1:30:00')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(validateDurationInput('invalid')).toBe(false);
    expect(validateDurationInput('12')).toBe(false);
    expect(validateDurationInput('12:60')).toBe(false);
    expect(validateDurationInput('00:60:00')).toBe(false);
    expect(validateDurationInput('')).toBe(false);
  });
});
