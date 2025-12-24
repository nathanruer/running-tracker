import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatDurationShort,
  formatPace,
  formatDistance,
  formatDate,
  parseDuration,
  formatNumber,
  formatHeartRate,
  normalizePaceDisplay,
} from '../formatters';

describe('formatters', () => {
  describe('formatDuration', () => {
    it('should format duration in seconds to HH:MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00:00');
      expect(formatDuration(61)).toBe('00:01:01');
      expect(formatDuration(3661)).toBe('01:01:01');
      expect(formatDuration(7200)).toBe('02:00:00');
      expect(formatDuration(86399)).toBe('23:59:59');
    });

    it('should pad single digits with zeros', () => {
      expect(formatDuration(5)).toBe('00:00:05');
      expect(formatDuration(65)).toBe('00:01:05');
      expect(formatDuration(3605)).toBe('01:00:05');
    });
  });

  describe('formatDurationShort', () => {
    it('should format duration in seconds to MM:SS', () => {
      expect(formatDurationShort(0)).toBe('00:00');
      expect(formatDurationShort(125)).toBe('02:05');
      expect(formatDurationShort(600)).toBe('10:00');
      expect(formatDurationShort(59)).toBe('00:59');
    });

    it('should round seconds to nearest integer', () => {
      expect(formatDurationShort(125.4)).toBe('02:05');
      expect(formatDurationShort(125.6)).toBe('02:06');
    });

    it('should handle large values (hours converted to minutes)', () => {
      expect(formatDurationShort(3600)).toBe('60:00');
      expect(formatDurationShort(7325)).toBe('122:05');
    });
  });

  describe('formatPace', () => {
    it('should calculate and format pace correctly', () => {
      // 5km in 25 minutes (1500 seconds) = 5:00 min/km
      expect(formatPace(5000, 1500)).toBe('05:00');

      // 10km in 50 minutes (3000 seconds) = 5:00 min/km
      expect(formatPace(10000, 3000)).toBe('05:00');

      // 1km in 4 minutes (240 seconds) = 4:00 min/km
      expect(formatPace(1000, 240)).toBe('04:00');
    });

    it('should return 00:00 when distance is 0', () => {
      expect(formatPace(0, 1000)).toBe('00:00');
    });

    it('should round seconds to nearest integer', () => {
      // 5km in 24:30 (1470 seconds) = 4:54 min/km
      expect(formatPace(5000, 1470)).toBe('04:54');
    });

    it('should handle very fast paces', () => {
      // 1km in 3 minutes (180 seconds) = 3:00 min/km
      expect(formatPace(1000, 180)).toBe('03:00');
    });

    it('should handle slow paces', () => {
      // 1km in 8 minutes (480 seconds) = 8:00 min/km
      expect(formatPace(1000, 480)).toBe('08:00');
    });
  });

  describe('formatDistance', () => {
    it('should format distance in kilometers by default', () => {
      expect(formatDistance(5432)).toBe('5.4 km');
      expect(formatDistance(10000)).toBe('10.0 km');
      expect(formatDistance(1234)).toBe('1.2 km');
    });

    it('should format distance in meters when specified', () => {
      expect(formatDistance(543, 'm')).toBe('543 m');
      expect(formatDistance(1234, 'm')).toBe('1234 m');
    });

    it('should respect custom decimal places for km', () => {
      expect(formatDistance(5432, 'km', 0)).toBe('5 km');
      expect(formatDistance(5432, 'km', 2)).toBe('5.43 km');
      expect(formatDistance(5432, 'km', 3)).toBe('5.432 km');
    });

    it('should round meters to nearest integer', () => {
      expect(formatDistance(543.7, 'm')).toBe('544 m');
      expect(formatDistance(543.2, 'm')).toBe('543 m');
    });
  });

  describe('formatDate', () => {
    it('should format date in short format (DD/MM/YYYY)', () => {
      expect(formatDate(new Date('2024-01-15'))).toBe('15/01/2024');
      expect(formatDate('2024-12-31')).toBe('31/12/2024');
    });

    it('should format date in long format (French)', () => {
      const result = formatDate(new Date('2024-01-15'), 'long');
      expect(result).toMatch(/15 janvier 2024/);
    });

    it('should format date in ISO format (YYYY-MM-DD)', () => {
      expect(formatDate(new Date('2024-01-15'), 'iso')).toBe('2024-01-15');
      expect(formatDate('2024-12-31', 'iso')).toBe('2024-12-31');
    });

    it('should handle Date objects and date strings', () => {
      const dateObj = new Date('2024-06-20');
      const dateStr = '2024-06-20';

      expect(formatDate(dateObj)).toBe(formatDate(dateStr));
    });
  });

  describe('parseDuration', () => {
    it('should parse HH:MM:SS format to seconds', () => {
      expect(parseDuration('01:30:00')).toBe(5400);
      expect(parseDuration('00:05:30')).toBe(330);
      expect(parseDuration('02:15:45')).toBe(8145);
    });

    it('should parse MM:SS format to seconds', () => {
      expect(parseDuration('05:30')).toBe(330);
      expect(parseDuration('00:45')).toBe(45);
      expect(parseDuration('12:00')).toBe(720);
    });

    it('should return 0 for invalid formats', () => {
      expect(parseDuration('invalid')).toBe(0);
      expect(parseDuration('')).toBe(0);
      expect(parseDuration('5')).toBe(0);
    });

    it('should be inverse of formatDuration', () => {
      const seconds = 3661;
      const formatted = formatDuration(seconds);
      expect(parseDuration(formatted)).toBe(seconds);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with French thousand separators', () => {
      // French locale uses narrow no-break space (\u202f) as thousand separator
      expect(formatNumber(1234)).toBe('1\u202f234');
      expect(formatNumber(1234567)).toBe('1\u202f234\u202f567');
    });

    it('should format numbers with specified decimals', () => {
      // French locale uses comma as decimal separator and narrow no-break space as thousand separator
      expect(formatNumber(1234.56, 2)).toBe('1\u202f234,56');
      expect(formatNumber(1234.567, 1)).toBe('1\u202f234,6');
      expect(formatNumber(1234, 2)).toBe('1\u202f234,00');
    });

    it('should default to 0 decimals', () => {
      expect(formatNumber(1234.56)).toBe('1\u202f235');
      expect(formatNumber(1234.4)).toBe('1\u202f234');
    });
  });

  describe('formatHeartRate', () => {
    it('should format heart rate with bpm unit', () => {
      expect(formatHeartRate(145)).toBe('145 bpm');
      expect(formatHeartRate(72)).toBe('72 bpm');
      expect(formatHeartRate(180)).toBe('180 bpm');
    });

    it('should round to nearest integer', () => {
      expect(formatHeartRate(145.6)).toBe('146 bpm');
      expect(formatHeartRate(145.4)).toBe('145 bpm');
    });

    it('should return -- for 0 or negative values', () => {
      expect(formatHeartRate(0)).toBe('--');
      expect(formatHeartRate(-5)).toBe('--');
    });
  });

  describe('normalizePaceDisplay', () => {
    it('should add leading zeros to minutes', () => {
      expect(normalizePaceDisplay('5:00')).toBe('05:00');
      expect(normalizePaceDisplay('7:30')).toBe('07:30');
      expect(normalizePaceDisplay('9:45')).toBe('09:45');
    });

    it('should keep already formatted paces unchanged', () => {
      expect(normalizePaceDisplay('05:00')).toBe('05:00');
      expect(normalizePaceDisplay('07:30')).toBe('07:30');
      expect(normalizePaceDisplay('12:00')).toBe('12:00');
    });

    it('should add leading zeros to seconds too', () => {
      expect(normalizePaceDisplay('5:5')).toBe('05:05');
      expect(normalizePaceDisplay('7:0')).toBe('07:00');
    });

    it('should return null for null or undefined input', () => {
      expect(normalizePaceDisplay(null)).toBeNull();
      expect(normalizePaceDisplay(undefined)).toBeNull();
    });

    it('should return original string for invalid formats', () => {
      expect(normalizePaceDisplay('invalid')).toBe('invalid');
      expect(normalizePaceDisplay('5:00:00')).toBe('5:00:00');
    });
  });
});
