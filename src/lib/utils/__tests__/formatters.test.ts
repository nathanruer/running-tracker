import {
  calculatePaceString,
  formatDistance,
  formatDate,
  formatNumber,
  formatHeartRate,
  extractHeartRateValue,
} from '../formatters';
import { normalizePaceFormat } from '../duration';

describe('formatters', () => {
  describe('calculatePaceString', () => {
    it('should calculate and format pace correctly', () => {
      // 5km in 25 minutes (1500 seconds) = 5:00 min/km
      expect(calculatePaceString(5000, 1500)).toBe('05:00');

      // 10km in 50 minutes (3000 seconds) = 5:00 min/km
      expect(calculatePaceString(10000, 3000)).toBe('05:00');

      // 1km in 4 minutes (240 seconds) = 4:00 min/km
      expect(calculatePaceString(1000, 240)).toBe('04:00');
    });

    it('should return 00:00 when distance is 0', () => {
      expect(calculatePaceString(0, 1000)).toBe('00:00');
    });

    it('should round seconds to nearest integer', () => {
      // 5km in 24:30 (1470 seconds) = 4:54 min/km
      expect(calculatePaceString(5000, 1470)).toBe('04:54');
    });

    it('should handle very fast paces', () => {
      // 1km in 3 minutes (180 seconds) = 3:00 min/km
      expect(calculatePaceString(1000, 180)).toBe('03:00');
    });

    it('should handle slow paces', () => {
      // 1km in 8 minutes (480 seconds) = 8:00 min/km
      expect(calculatePaceString(1000, 480)).toBe('08:00');
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

  describe('formatNumber', () => {
    it('should format numbers with French thousand separators', () => {
      expect(formatNumber(1234)).toBe('1\u202f234');
      expect(formatNumber(1234567)).toBe('1\u202f234\u202f567');
    });

    it('should format numbers with specified decimals', () => {
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

  describe('normalizePaceFormat', () => {
    it('should add leading zeros to minutes', () => {
      expect(normalizePaceFormat('5:00')).toBe('05:00');
      expect(normalizePaceFormat('7:30')).toBe('07:30');
      expect(normalizePaceFormat('9:45')).toBe('09:45');
    });

    it('should keep already formatted paces unchanged', () => {
      expect(normalizePaceFormat('05:00')).toBe('05:00');
      expect(normalizePaceFormat('07:30')).toBe('07:30');
      expect(normalizePaceFormat('12:00')).toBe('12:00');
    });

    it('should add leading zeros to seconds too', () => {
      expect(normalizePaceFormat('5:5')).toBe('05:05');
      expect(normalizePaceFormat('7:0')).toBe('07:00');
    });

    it('should return null for null or undefined input', () => {
      expect(normalizePaceFormat(null as unknown as string)).toBeNull();
      expect(normalizePaceFormat(undefined as unknown as string)).toBeNull();
    });

    it('should return null for invalid formats', () => {
      expect(normalizePaceFormat('invalid')).toBeNull();
      expect(normalizePaceFormat('5:00:00')).toBeNull();
    });
  });

  describe('extractHeartRateValue', () => {
    it('should return number when input is number', () => {
      expect(extractHeartRateValue(150)).toBe(150);
    });

    it('should parse string to number', () => {
      expect(extractHeartRateValue('150')).toBe(150);
      expect(extractHeartRateValue('150.5')).toBe(150.5);
    });

    it('should return null for invalid strings', () => {
      expect(extractHeartRateValue('invalid')).toBeNull();
      expect(extractHeartRateValue('')).toBeNull();
    });

    it('should return null for null or undefined', () => {
      expect(extractHeartRateValue(null)).toBeNull();
      expect(extractHeartRateValue(undefined)).toBeNull();
    });
  });
});

