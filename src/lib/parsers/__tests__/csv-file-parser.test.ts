import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseJsonFile, parseCsvFile, parseTrainingFile } from '../csv-file-parser';
import Papa from 'papaparse';

vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
  },
}));

vi.mock('../csv-import-helpers', () => ({
  parseDate: vi.fn((str: string) => {
    if (!str || str === '') return '';
    return str;
  }),
  parseDuration: vi.fn((str: string) => str || '00:00:00'),
  parsePace: vi.fn((str: string) => str || '00:00'),
  parseNumber: vi.fn((str: string) => parseFloat(str) || 0),
  detectColumns: vi.fn((headers: string[]) => {
    const map = new Map<string, string>();
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('date')) map.set('date', h);
      if (lower.includes('type') || lower.includes('séance')) map.set('sessionType', h);
      if (lower.includes('durée') || lower.includes('duration')) map.set('duration', h);
      if (lower.includes('distance')) map.set('distance', h);
      if (lower.includes('allure') || lower.includes('pace')) map.set('avgPace', h);
      if (lower.includes('fc') || lower.includes('heart')) map.set('avgHeartRate', h);
      if (lower.includes('rpe') || lower.includes('exertion')) map.set('perceivedExertion', h);
      if (lower.includes('comment')) map.set('comments', h);
      if (lower.includes('interval')) map.set('intervalStructure', h);
    });
    return map;
  }),
}));

describe('csv-file-parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseJsonFile', () => {
    it('should parse valid JSON file with single session', async () => {
      const jsonContent = JSON.stringify({
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
        distance: 15.5,
        avgPace: '05:30',
        avgHeartRate: 145,
        perceivedExertion: 7,
        comments: 'Great run',
      });

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseJsonFile(file);

      expect(result.error).toBeNull();
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].sessionType).toBe('Endurance');
      expect(result.sessions[0].date).toBe('2024-01-15');
    });

    it('should parse JSON file with array of sessions', async () => {
      const jsonContent = JSON.stringify([
        {
          date: '2024-01-15',
          sessionType: 'Endurance',
          duration: '01:30:00',
          distance: 15.5,
          avgPace: '05:30',
          avgHeartRate: 145,
        },
        {
          date: '2024-01-16',
          sessionType: 'Interval',
          duration: '01:00:00',
          distance: 10,
          avgPace: '04:30',
          avgHeartRate: 165,
        },
      ]);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseJsonFile(file);

      expect(result.error).toBeNull();
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].sessionType).toBe('Endurance');
      expect(result.sessions[1].sessionType).toBe('Interval');
    });

    it('should handle French column names', async () => {
      const jsonContent = JSON.stringify({
        Date: '2024-01-15',
        'Type de séance': 'Endurance',
        'Durée': '01:30:00',
        'Distance (km)': 15.5,
        'Allure (mn/km)': '05:30',
        'FC moyenne (bpm)': 145,
      });

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseJsonFile(file);

      expect(result.error).toBeNull();
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].sessionType).toBe('Endurance');
    });

    it('should handle interval details as string', async () => {
      const jsonContent = JSON.stringify({
        date: '2024-01-15',
        sessionType: 'Fractionné',
        duration: '01:00:00',
        distance: 10,
        avgPace: '04:30',
        avgHeartRate: 165,
        intervalDetails: 'VMA: 8x400m R:2\'00',
      });

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseJsonFile(file);

      expect(result.error).toBeNull();
      expect(result.sessions[0].intervalDetails).toBe('VMA: 8x400m R:2\'00');
    });

    it('should handle interval details as object', async () => {
      const jsonContent = JSON.stringify({
        date: '2024-01-15',
        sessionType: 'Fractionné',
        duration: '01:00:00',
        distance: 10,
        avgPace: '04:30',
        avgHeartRate: 165,
        intervalDetails: {
          workoutType: 'VMA',
          repetitionCount: 8,
        },
      });

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseJsonFile(file);

      expect(result.error).toBeNull();
      expect(result.sessions[0].intervalDetails).toContain('workoutType');
    });

    it('should filter out invalid sessions (missing date or type)', async () => {
      const jsonContent = JSON.stringify([
        {
          date: '2024-01-15',
          sessionType: 'Endurance',
          duration: '01:30:00',
        },
        {
          // Missing date
          sessionType: 'Interval',
          duration: '01:00:00',
        },
        {
          date: '2024-01-16',
          // Missing sessionType
          duration: '01:00:00',
        },
      ]);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseJsonFile(file);

      expect(result.error).toBeNull();
      expect(result.sessions).toHaveLength(1);
    });

    it('should return error when no valid sessions found', async () => {
      const jsonContent = JSON.stringify([
        { duration: '01:00:00' }, // Missing date and type
      ]);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseJsonFile(file);

      expect(result.error).toBe('Aucune séance valide trouvée dans le fichier JSON.');
      expect(result.sessions).toHaveLength(0);
    });

    it('should return error for invalid JSON', async () => {
      const invalidJson = '{"invalid": "json"'; // Missing closing brace - invalid JSON

      const blob = new Blob([invalidJson], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseJsonFile(file);

      expect(result.error).toBe('Erreur lors de la lecture du fichier JSON.');
      expect(result.sessions).toHaveLength(0);
    });
  });

  describe('parseCsvFile', () => {
    it('should parse valid CSV file', async () => {
      const mockData = [
        {
          Date: '2024-01-15',
          'Type de séance': 'Endurance',
          'Durée': '01:30:00',
          'Distance': '15.5',
          'Allure': '05:30',
          'FC moyenne': '145',
        },
      ];

      const mockFile = new File([''], 'test.csv', { type: 'text/csv' });

      (Papa.parse as ReturnType<typeof vi.fn>).mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: {
            fields: ['Date', 'Type de séance', 'Durée', 'Distance', 'Allure', 'FC moyenne'],
          },
        });
      });

      const result = await parseCsvFile(mockFile);

      expect(result.error).toBeNull();
      expect(result.sessions).toHaveLength(1);
    });

    it('should handle missing columns gracefully', async () => {
      const mockData = [
        {
          Date: '2024-01-15',
          'Type': 'Endurance',
          // Missing other columns
        },
      ];

      const mockFile = new File([''], 'test.csv', { type: 'text/csv' });

      (Papa.parse as ReturnType<typeof vi.fn>).mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: {
            fields: ['Date', 'Type'],
          },
        });
      });

      const result = await parseCsvFile(mockFile);

      expect(result.error).toBeNull();
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].distance).toBe(0);
      expect(result.sessions[0].avgHeartRate).toBe(0);
    });

    it('should filter out invalid sessions', async () => {
      const mockData = [
        {
          Date: '2024-01-15',
          Type: 'Endurance',
        },
        {
          Date: '',
          Type: 'Interval',
        },
        {
          Date: '2024-01-16',
          Type: '',
        },
      ];

      const mockFile = new File([''], 'test.csv', { type: 'text/csv' });

      (Papa.parse as ReturnType<typeof vi.fn>).mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: {
            fields: ['Date', 'Type'],
          },
        });
      });

      const result = await parseCsvFile(mockFile);

      expect(result.sessions).toHaveLength(1);
    });

    it('should return error when no valid sessions found', async () => {
      const mockData = [
        {
          SomeColumn: 'value',
        },
      ];

      const mockFile = new File([''], 'test.csv', { type: 'text/csv' });

      (Papa.parse as ReturnType<typeof vi.fn>).mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: {
            fields: ['SomeColumn'],
          },
        });
      });

      const result = await parseCsvFile(mockFile);

      expect(result.error).toContain('Aucune séance valide trouvée');
      expect(result.sessions).toHaveLength(0);
    });

    it('should handle Papa.parse error', async () => {
      const mockFile = new File([''], 'test.csv', { type: 'text/csv' });

      (Papa.parse as ReturnType<typeof vi.fn>).mockImplementation((file, options) => {
        options.error();
      });

      const result = await parseCsvFile(mockFile);

      expect(result.error).toBe('Erreur lors de la lecture du fichier.');
      expect(result.sessions).toHaveLength(0);
    });

    it('should handle interval structure column', async () => {
      const mockData = [
        {
          Date: '2024-01-15',
          Type: 'Fractionné',
          'Durée': '01:00:00',
          'Structure intervalle': 'VMA: 8x400m',
        },
      ];

      const mockFile = new File([''], 'test.csv', { type: 'text/csv' });

      (Papa.parse as ReturnType<typeof vi.fn>).mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: {
            fields: ['Date', 'Type', 'Durée', 'Structure intervalle'],
          },
        });
      });

      const result = await parseCsvFile(mockFile);

      expect(result.error).toBeNull();
      expect(result.sessions[0].intervalDetails).toBe('VMA: 8x400m');
    });
  });

  describe('parseTrainingFile', () => {
    it('should call parseJsonFile for .json extension', async () => {
      const jsonContent = JSON.stringify({
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
      });

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });

      const result = await parseTrainingFile(file);

      expect(result.sessions).toHaveLength(1);
    });

    it('should call parseJsonFile for application/json MIME type', async () => {
      const jsonContent = JSON.stringify({
        date: '2024-01-15',
        sessionType: 'Endurance',
        duration: '01:30:00',
      });

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'data', { type: 'application/json' });

      const result = await parseTrainingFile(file);

      expect(result.sessions).toHaveLength(1);
    });

    it('should call parseCsvFile for .csv extension', async () => {
      const mockFile = new File([''], 'test.csv', { type: 'text/csv' });

      (Papa.parse as ReturnType<typeof vi.fn>).mockImplementation((file, options) => {
        options.complete({
          data: [
            {
              Date: '2024-01-15',
              Type: 'Endurance',
            },
          ],
          meta: {
            fields: ['Date', 'Type'],
          },
        });
      });

      await parseTrainingFile(mockFile);

      expect(Papa.parse).toHaveBeenCalled();
    });

    it('should call parseCsvFile for non-JSON files', async () => {
      const mockFile = new File([''], 'test.txt', { type: 'text/plain' });

      (Papa.parse as ReturnType<typeof vi.fn>).mockImplementation((file, options) => {
        options.complete({
          data: [
            {
              Date: '2024-01-15',
              Type: 'Endurance',
            },
          ],
          meta: {
            fields: ['Date', 'Type'],
          },
        });
      });

      await parseTrainingFile(mockFile);

      expect(Papa.parse).toHaveBeenCalled();
    });
  });
});
