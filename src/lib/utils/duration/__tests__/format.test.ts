import { describe, it, expect } from 'vitest';
import { 
  formatDuration, 
  normalizeDurationFormat, 
  formatDurationHHMMSS, 
  normalizeDurationToHHMMSS, 
  formatDisplayDuration, 
  formatMinutesToHHMMSS 
} from '../format';

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

describe('formatDurationHHMMSS', () => {
  it('should always format as HH:MM:SS', () => {
    expect(formatDurationHHMMSS(2910)).toBe('00:48:30');
    expect(formatDurationHHMMSS(5400)).toBe('01:30:00');
    expect(formatDurationHHMMSS(0)).toBe('00:00:00');
  });

  it('should handle edge cases', () => {
    expect(formatDurationHHMMSS(-1)).toBe('00:00:00');
    expect(formatDurationHHMMSS(Infinity)).toBe('00:00:00');
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

describe('normalizeDurationToHHMMSS', () => {
  it('should normalize to HH:MM:SS', () => {
    expect(normalizeDurationToHHMMSS('48:30')).toBe('00:48:30');
    expect(normalizeDurationToHHMMSS('1:30:00')).toBe('01:30:00');
  });

  it('should return null for empty input', () => {
    expect(normalizeDurationToHHMMSS(null)).toBe(null);
    expect(normalizeDurationToHHMMSS('')).toBe(null);
  });

  it('should return input as is if parsing fails', () => {
    expect(normalizeDurationToHHMMSS('invalid')).toBe('invalid');
  });
});

describe('formatDisplayDuration', () => {
  it('should format for display', () => {
    expect(formatDisplayDuration('48:30')).toBe('48:30');
    expect(formatDisplayDuration('01:30:00')).toBe('01:30:00');
  });

  it('should return -- for empty input', () => {
    expect(formatDisplayDuration(null)).toBe('--');
    expect(formatDisplayDuration('')).toBe('--');
  });

  it('should return input if normalization fails', () => {
    expect(formatDisplayDuration('invalid')).toBe('invalid');
  });
});

describe('formatMinutesToHHMMSS', () => {
  it('should format minutes to HH:MM:SS', () => {
    expect(formatMinutesToHHMMSS(45)).toBe('00:45:00');
    expect(formatMinutesToHHMMSS(90)).toBe('01:30:00');
    expect(formatMinutesToHHMMSS(125)).toBe('02:05:00');
  });

  it('should handle edge cases', () => {
    expect(formatMinutesToHHMMSS(0)).toBe('00:00:00');
    expect(formatMinutesToHHMMSS(-1)).toBe('00:00:00');
    expect(formatMinutesToHHMMSS(Infinity)).toBe('00:00:00');
  });
});
