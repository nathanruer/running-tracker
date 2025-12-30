import { describe, it, expect } from 'vitest';
import {
  parseDate,
  normalizeCsvDuration,
  parsePace,
  parseNumber,
  detectColumns,
} from '../csv-import-helpers';

describe('csv-import-helpers', () => {
  describe('parseDate', () => {
    it('should parse DD/MM/YYYY format', () => {
      expect(parseDate('15/01/2024')).toBe('2024-01-15');
      expect(parseDate('31/12/2023')).toBe('2023-12-31');
      expect(parseDate('01/06/2024')).toBe('2024-06-01');
    });

    it('should parse DD-MM-YYYY format', () => {
      expect(parseDate('15-01-2024')).toBe('2024-01-15');
      expect(parseDate('31-12-2023')).toBe('2023-12-31');
      expect(parseDate('01-06-2024')).toBe('2024-06-01');
    });

    it('should parse YYYY-MM-DD format (already normalized)', () => {
      expect(parseDate('2024-01-15')).toBe('2024-01-15');
      expect(parseDate('2023-12-31')).toBe('2023-12-31');
      expect(parseDate('2024-06-01')).toBe('2024-06-01');
    });

    it('should return empty string for invalid formats', () => {
      expect(parseDate('invalid')).toBe('');
      expect(parseDate('2024/01/15')).toBe('');
      expect(parseDate('15.01.2024')).toBe('');
      expect(parseDate('abc-def-ghij')).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(parseDate('')).toBe('');
    });

    it('should handle partial dates correctly', () => {
      expect(parseDate('15/01')).toBe('');
      expect(parseDate('2024-01')).toBe('');
    });
  });

  describe('normalizeCsvDuration', () => {
    it('should return HH:MM:SS as-is', () => {
      expect(normalizeCsvDuration('01:30:00')).toBe('01:30:00');
      expect(normalizeCsvDuration('00:45:30')).toBe('00:45:30');
      expect(normalizeCsvDuration('10:15:45')).toBe('10:15:45');
    });

    it('should convert MM:SS to 00:MM:SS', () => {
      expect(normalizeCsvDuration('30:00')).toBe('00:30:00');
      expect(normalizeCsvDuration('45:30')).toBe('00:45:30');
      expect(normalizeCsvDuration('05:15')).toBe('00:05:15');
    });

    it('should return default for invalid format', () => {
      expect(normalizeCsvDuration('invalid')).toBe('00:00:00');
      expect(normalizeCsvDuration('30')).toBe('00:00:00');
      expect(normalizeCsvDuration('')).toBe('00:00:00');
    });

    it('should handle edge cases', () => {
      expect(normalizeCsvDuration('0:0:0')).toBe('0:0:0');
      expect(normalizeCsvDuration('100:59:59')).toBe('100:59:59');
    });
  });

  describe('parsePace', () => {
    it('should parse valid pace MM:SS', () => {
      expect(parsePace('5:30')).toBe('05:30');
      expect(parsePace('05:30')).toBe('05:30');
      expect(parsePace('10:00')).toBe('10:00');
    });

    it('should pad single digit minutes', () => {
      expect(parsePace('4:15')).toBe('04:15');
      expect(parsePace('3:45')).toBe('03:45');
    });

    it('should return default for invalid pace', () => {
      expect(parsePace('invalid')).toBe('00:00');
      expect(parsePace('')).toBe('00:00');
      expect(parsePace('5')).toBe('00:00');
    });

    it('should handle pace within larger strings', () => {
      expect(parsePace('Pace: 5:30')).toBe('05:30');
      expect(parsePace('4:15 min/km')).toBe('04:15');
    });
  });

  describe('parseNumber', () => {
    it('should parse valid numbers', () => {
      expect(parseNumber('15.5')).toBe(15.5);
      expect(parseNumber('10')).toBe(10);
      expect(parseNumber('0.5')).toBe(0.5);
      expect(parseNumber('100')).toBe(100);
    });

    it('should handle comma as decimal separator', () => {
      expect(parseNumber('15,5')).toBe(15.5);
      expect(parseNumber('10,25')).toBe(10.25);
      expect(parseNumber('0,5')).toBe(0.5);
    });

    it('should return 0 for empty or invalid input', () => {
      expect(parseNumber('')).toBe(0);
      expect(parseNumber('   ')).toBe(0);
      expect(parseNumber('invalid')).toBe(0);
      expect(parseNumber('abc123')).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(parseNumber('-5.5')).toBe(-5.5);
      expect(parseNumber('-10')).toBe(-10);
    });

    it('should handle numbers with whitespace', () => {
      expect(parseNumber(' 15.5 ')).toBe(15.5);
      expect(parseNumber('  10  ')).toBe(10);
    });
  });

  describe('detectColumns', () => {
    it('should detect French column names', () => {
      const headers = [
        'Date',
        'Type de séance',
        'Durée',
        'Distance (km)',
        'Allure (mn/km)',
        'FC moyenne (bpm)',
        'RPE',
        'Commentaires',
      ];

      const map = detectColumns(headers);

      expect(map.get('date')).toBe('Date');
      expect(map.get('sessionType')).toBe('Type de séance');
      expect(map.get('duration')).toBe('Durée');
      expect(map.get('distance')).toBe('Distance (km)');
      expect(map.get('avgPace')).toBe('Allure (mn/km)');
      expect(map.get('avgHeartRate')).toBe('FC moyenne (bpm)');
      expect(map.get('perceivedExertion')).toBe('RPE');
      expect(map.get('comments')).toBe('Commentaires');
    });

    it('should detect English column names', () => {
      const headers = [
        'Date',
        'Type',
        'Duration',
        'Distance',
        'Pace',
        'Heart Rate',
        'Effort',
        'Comments',
      ];

      const map = detectColumns(headers);

      expect(map.get('date')).toBe('Date');
      expect(map.get('sessionType')).toBe('Type');
      expect(map.get('duration')).toBe('Duration');
      expect(map.get('distance')).toBe('Distance');
      expect(map.get('avgPace')).toBe('Pace');
      expect(map.get('avgHeartRate')).toBe('Heart Rate');
      expect(map.get('perceivedExertion')).toBe('Effort');
      expect(map.get('comments')).toBe('Comments');
    });

    it('should detect interval structure column variations', () => {
      const headers1 = ['Date', 'Type', 'Structure intervalle'];
      const map1 = detectColumns(headers1);
      expect(map1.get('intervalStructure')).toBe('Structure intervalle');

      const headers2 = ['Date', 'Type', 'Interval'];
      const map2 = detectColumns(headers2);
      expect(map2.get('intervalStructure')).toBe('Interval');

      const headers3 = ['Date', 'Type', 'Fractionné'];
      const map3 = detectColumns(headers3);
      expect(map3.get('intervalStructure')).toBe('Fractionné');
    });

    it('should handle case-insensitive matching', () => {
      const headers = [
        'DATE',
        'type',
        'DURATION',
        'distance',
        'PACE',
        'heart rate',
      ];

      const map = detectColumns(headers);

      expect(map.get('date')).toBe('DATE');
      expect(map.get('sessionType')).toBe('type');
      expect(map.get('duration')).toBe('DURATION');
      expect(map.get('distance')).toBe('distance');
      expect(map.get('avgPace')).toBe('PACE');
      expect(map.get('avgHeartRate')).toBe('heart rate');
    });

    it('should handle headers with extra whitespace', () => {
      const headers = ['  Date  ', '  Type  ', '  Duration  '];

      const map = detectColumns(headers);

      expect(map.get('date')).toBe('  Date  ');
      expect(map.get('sessionType')).toBe('  Type  ');
      expect(map.get('duration')).toBe('  Duration  ');
    });

    it('should skip empty headers', () => {
      const headers = ['Date', '', 'Type', '   ', 'Duration'];

      const map = detectColumns(headers);

      expect(map.size).toBe(3);
      expect(map.get('date')).toBe('Date');
      expect(map.get('sessionType')).toBe('Type');
      expect(map.get('duration')).toBe('Duration');
    });

    it('should handle mixed French/English column names', () => {
      const headers = [
        'Date',
        'Type de séance',
        'Duration',
        'Distance',
        'Allure',
        'Heart Rate',
      ];

      const map = detectColumns(headers);

      expect(map.get('date')).toBe('Date');
      expect(map.get('sessionType')).toBe('Type de séance');
      expect(map.get('duration')).toBe('Duration');
      expect(map.get('distance')).toBe('Distance');
      expect(map.get('avgPace')).toBe('Allure');
      expect(map.get('avgHeartRate')).toBe('Heart Rate');
    });

    it('should handle unrecognized columns gracefully', () => {
      const headers = ['Date', 'Type', 'Unknown Column', 'Another Unknown'];

      const map = detectColumns(headers);

      expect(map.size).toBe(2);
      expect(map.get('date')).toBe('Date');
      expect(map.get('sessionType')).toBe('Type');
      expect(map.has('Unknown Column')).toBe(false);
    });

    it('should detect accented and non-accented French variations', () => {
      const headers1 = ['Date', 'Durée', 'Séance'];
      const map1 = detectColumns(headers1);
      expect(map1.get('duration')).toBe('Durée');
      expect(map1.get('sessionType')).toBe('Séance');

      const headers2 = ['Date', 'Duree', 'Seance'];
      const map2 = detectColumns(headers2);
      expect(map2.get('duration')).toBe('Duree');
      expect(map2.get('sessionType')).toBe('Seance');
    });
  });
});
