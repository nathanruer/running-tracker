import { describe, it, expect } from 'vitest';
import {
  parseDuration,
  formatDuration,
  validateDurationInput,
  normalizeDurationFormat,
  validatePaceInput,
  normalizePaceFormat,
} from '../duration';

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

describe('formatDuration', () => {
  describe('Durations < 1 hour (use MM:SS)', () => {
    it('should format short durations as MM:SS', () => {
      expect(formatDuration(2910)).toBe('48:30');
      expect(formatDuration(330)).toBe('05:30');
      expect(formatDuration(30)).toBe('00:30');
      expect(formatDuration(3599)).toBe('59:59');
    });

    it('should pad with zeros', () => {
      expect(formatDuration(305)).toBe('05:05');
      expect(formatDuration(5)).toBe('00:05');
    });
  });

  describe('Durations >= 1 hour (use HH:MM:SS)', () => {
    it('should format long durations as HH:MM:SS', () => {
      expect(formatDuration(3600)).toBe('01:00:00');
      expect(formatDuration(5400)).toBe('01:30:00');
      expect(formatDuration(8145)).toBe('02:15:45');
    });

    it('should pad with zeros', () => {
      expect(formatDuration(3605)).toBe('01:00:05');
      expect(formatDuration(3665)).toBe('01:01:05');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('should handle negative numbers', () => {
      expect(formatDuration(-100)).toBe('00:00');
    });

    it('should handle infinity', () => {
      expect(formatDuration(Infinity)).toBe('00:00');
      expect(formatDuration(-Infinity)).toBe('00:00');
    });

    it('should round decimal seconds', () => {
      expect(formatDuration(125.6)).toBe('02:06');
      expect(formatDuration(125.4)).toBe('02:05');
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

describe('normalizeDurationFormat', () => {
  it('should normalize MM:SS format (keep as MM:SS if < 1h)', () => {
    expect(normalizeDurationFormat('48:30')).toBe('48:30');
    expect(normalizeDurationFormat('5:30')).toBe('05:30');
    expect(normalizeDurationFormat('5:5')).toBe('05:05');
  });

  it('should normalize HH:MM:SS to MM:SS if < 1h', () => {
    expect(normalizeDurationFormat('00:48:30')).toBe('48:30');
    expect(normalizeDurationFormat('00:05:30')).toBe('05:30');
  });

  it('should keep HH:MM:SS format if >= 1h', () => {
    expect(normalizeDurationFormat('01:30:00')).toBe('01:30:00');
    expect(normalizeDurationFormat('1:30:00')).toBe('01:30:00');
    expect(normalizeDurationFormat('02:15:45')).toBe('02:15:45');
  });

  it('should return null for invalid input', () => {
    expect(normalizeDurationFormat('invalid')).toBe(null);
    expect(normalizeDurationFormat('12:60')).toBe(null);
    expect(normalizeDurationFormat('')).toBe(null);
  });
});

describe('validatePaceInput', () => {
  it('should validate correct MM:SS pace format', () => {
    expect(validatePaceInput('05:30')).toBe(true);
    expect(validatePaceInput('5:30')).toBe(true);
    expect(validatePaceInput('04:15')).toBe(true);
    expect(validatePaceInput('10:00')).toBe(true);
  });

  it('should reject HH:MM:SS format for pace', () => {
    expect(validatePaceInput('00:05:30')).toBe(false);
    expect(validatePaceInput('01:05:30')).toBe(false);
  });

  it('should reject invalid formats', () => {
    expect(validatePaceInput('invalid')).toBe(false);
    expect(validatePaceInput('12')).toBe(false);
    expect(validatePaceInput('12:60')).toBe(false); // seconds >= 60
    expect(validatePaceInput('')).toBe(false);
  });

  it('should reject negative values', () => {
    expect(validatePaceInput('-5:30')).toBe(false);
    expect(validatePaceInput('5:-30')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validatePaceInput(null as unknown as string)).toBe(false);
    expect(validatePaceInput(undefined as unknown as string)).toBe(false);
  });
});

describe('normalizePaceFormat', () => {
  it('should normalize pace to MM:SS with padding', () => {
    expect(normalizePaceFormat('5:30')).toBe('05:30');
    expect(normalizePaceFormat('05:30')).toBe('05:30');
    expect(normalizePaceFormat('4:5')).toBe('04:05');
  });

  it('should return null for invalid pace', () => {
    expect(normalizePaceFormat('invalid')).toBe(null);
    expect(normalizePaceFormat('12:60')).toBe(null);
    expect(normalizePaceFormat('00:05:30')).toBe(null); // HH:MM:SS not allowed for pace
    expect(normalizePaceFormat('')).toBe(null);
  });
});