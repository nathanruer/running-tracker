import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSession } from '@/lib/types';
import {
  formatSessionsStandard,
  getStandardHeaders,
  formatSessionsDetailed,
  getDetailedHeaders,
  formatSessionsStandardJSON,
  formatSessionsDetailedJSON,
  generateCSV,
  generateJSON,
  generateXLSX,
  downloadFile,
  downloadBlob,
  generateExportFilename,
  filterSessions,
  type ExportOptions,
} from '../session-export';

// ============================================================================
// MOCK DATA
// ============================================================================

const createMockSession = (overrides: Partial<TrainingSession> = {}): TrainingSession => ({
  id: 'session-1',
  userId: 'user-1',
  sessionNumber: 1,
  week: 1,
  date: '2024-01-15',
  sessionType: 'Endurance',
  duration: '01:00:00',
  distance: 10,
  avgPace: '6:00',
  avgHeartRate: 145,
  perceivedExertion: 6,
  comments: 'Good run',
  status: 'completed',
  intervalDetails: null,
  ...overrides,
});

const createPlannedSession = (overrides: Partial<TrainingSession> = {}): TrainingSession => ({
  id: 'session-2',
  userId: 'user-1',
  sessionNumber: 2,
  week: 1,
  date: null,
  sessionType: 'Interval',
  duration: null,
  distance: null,
  avgPace: null,
  avgHeartRate: null,
  perceivedExertion: null,
  comments: '',
  status: 'planned',
  targetDuration: 45,
  targetDistance: 8,
  targetPace: '5:30',
  targetHeartRateBpm: 160,
  targetRPE: 7,
  intervalDetails: null,
  ...overrides,
});

const createSessionWithWeather = (): TrainingSession =>
  createMockSession({
    weather: {
      temperature: 15,
      conditionCode: 0,
      windSpeed: 10,
      precipitation: 0,
    },
  });

const createSessionWithIntervals = (): TrainingSession =>
  createMockSession({
    sessionType: 'Interval',
    intervalDetails: {
      workoutType: '6x1000m',
      repetitionCount: 6,
      effortDuration: '04:00',
      recoveryDuration: '02:00',
      effortDistance: 1,
      recoveryDistance: null,
      targetEffortPace: '4:00',
      targetEffortHR: 170,
      targetRecoveryPace: '6:00',
      steps: [
        {
          stepNumber: 1,
          stepType: 'warmup',
          duration: '10:00',
          distance: 1.5,
          pace: '6:40',
          hr: 135,
        },
        {
          stepNumber: 2,
          stepType: 'effort',
          duration: '04:00',
          distance: 1,
          pace: '4:00',
          hr: 175,
        },
        {
          stepNumber: 3,
          stepType: 'recovery',
          duration: '02:00',
          distance: 0.4,
          pace: '5:00',
          hr: 140,
        },
        {
          stepNumber: 4,
          stepType: 'cooldown',
          duration: '08:00',
          distance: 1.2,
          pace: '6:40',
          hr: 130,
        },
      ],
    },
  });

// ============================================================================
// HEADERS TESTS
// ============================================================================

describe('getStandardHeaders', () => {
  it('returns base headers without weather', () => {
    const headers = getStandardHeaders(false);

    expect(headers).toEqual([
      'Numéro',
      'Semaine',
      'Date',
      'Type de séance',
      'Durée',
      'Distance (km)',
      'Allure (min/km)',
      'FC moyenne (bpm)',
      'RPE',
      'Structure intervalle',
      'Commentaires',
    ]);
  });

  it('includes weather headers when requested', () => {
    const headers = getStandardHeaders(true);

    expect(headers).toContain('Température (°C)');
    expect(headers).toContain('Météo');
    expect(headers).toContain('Vent (km/h)');
    expect(headers).toContain('Précipitations (mm)');
    expect(headers.indexOf('Commentaires')).toBe(headers.length - 1);
  });
});

describe('getDetailedHeaders', () => {
  it('returns base headers without weather', () => {
    const headers = getDetailedHeaders(false);

    expect(headers).toContain('Intervalles');
    expect(headers).not.toContain('Structure intervalle');
  });

  it('includes weather headers when requested', () => {
    const headers = getDetailedHeaders(true);

    expect(headers).toContain('Température (°C)');
    expect(headers).toContain('Météo');
  });
});

// ============================================================================
// STANDARD FORMAT TESTS
// ============================================================================

describe('formatSessionsStandard', () => {
  it('formats a completed session correctly', () => {
    const session = createMockSession();
    const rows = formatSessionsStandard([session], false);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      numero: 1,
      semaine: 1,
      date: '15/01/2024',
      type: 'Endurance',
      duree: '01:00:00',
      distance: 10,
      allure: '6:00',
      fc_moyenne: 145,
      rpe: 6,
      commentaires: 'Good run',
    });
  });

  it('formats a planned session using target values', () => {
    const session = createPlannedSession();
    const rows = formatSessionsStandard([session], false);

    expect(rows[0]).toMatchObject({
      duree: '00:45:00',
      distance: 8,
      allure: '5:30',
      fc_moyenne: 160,
      rpe: 7,
    });
  });

  it('handles session without date', () => {
    const session = createMockSession({ date: null });
    const rows = formatSessionsStandard([session], false);

    expect(rows[0].date).toBe('');
  });

  it('includes weather data when requested', () => {
    const session = createSessionWithWeather();
    const rows = formatSessionsStandard([session], true);

    expect(rows[0]).toMatchObject({
      temperature: '15',
      meteo: 'Ensoleillé',
      vent: '10',
      precipitations: '',
    });
  });

  it('handles session without weather when weather is requested', () => {
    const session = createMockSession();
    const rows = formatSessionsStandard([session], true);

    expect(rows[0].temperature).toBe('');
    expect(rows[0].meteo).toBe('');
  });

  it('formats interval structure', () => {
    const session = createSessionWithIntervals();
    const rows = formatSessionsStandard([session], false);

    expect(rows[0].structure_intervalle).toBeTruthy();
  });
});

// ============================================================================
// DETAILED FORMAT TESTS
// ============================================================================

describe('formatSessionsDetailed', () => {
  it('formats session with intervals as condensed text', () => {
    const session = createSessionWithIntervals();
    const rows = formatSessionsDetailed([session], false);

    expect(rows[0].intervalles).toContain('Échauff');
    expect(rows[0].intervalles).toContain('Effort');
    expect(rows[0].intervalles).toContain('Récup');
    expect(rows[0].intervalles).toContain('Ret.calme');
    expect(rows[0].intervalles).toContain('|');
  });

  it('returns empty string for session without intervals', () => {
    const session = createMockSession();
    const rows = formatSessionsDetailed([session], false);

    expect(rows[0].intervalles).toBe('');
  });

  it('includes weather data when requested', () => {
    const session = createSessionWithWeather();
    const rows = formatSessionsDetailed([session], true);

    expect(rows[0].temperature).toBe('15');
  });
});

// ============================================================================
// JSON FORMAT TESTS
// ============================================================================

describe('formatSessionsStandardJSON', () => {
  it('formats session for JSON export', () => {
    const session = createMockSession();
    const rows = formatSessionsStandardJSON([session], false);

    expect(rows[0]).toMatchObject({
      numero: 1,
      rpe: 6,
    });
  });

  it('returns null for missing RPE', () => {
    const session = createMockSession({ perceivedExertion: null });
    const rows = formatSessionsStandardJSON([session], false);

    expect(rows[0].rpe).toBeNull();
  });

  it('formats weather with units', () => {
    const session = createSessionWithWeather();
    const rows = formatSessionsStandardJSON([session], true);

    expect(rows[0].temperature).toBe('15°C');
    expect(rows[0].vent).toBe('10 km/h');
    expect(rows[0].precipitations).toBe('');
  });
});

describe('formatSessionsDetailedJSON', () => {
  it('formats intervals as native objects', () => {
    const session = createSessionWithIntervals();
    const rows = formatSessionsDetailedJSON([session], false);

    expect(rows[0].intervalles).toHaveLength(4);
    expect(rows[0].intervalles![0]).toMatchObject({
      num: 1,
      type: 'Échauffement',
      duree: '10:00',
      distance: 1.5,
      allure: '6:40',
      fc: 135,
    });
  });

  it('returns null for session without intervals', () => {
    const session = createMockSession();
    const rows = formatSessionsDetailedJSON([session], false);

    expect(rows[0].intervalles).toBeNull();
  });

  it('formats weather with units', () => {
    const session = createSessionWithWeather();
    const rows = formatSessionsDetailedJSON([session], true);

    expect(rows[0].temperature).toBe('15°C');
    expect(rows[0].vent).toBe('10 km/h');
  });
});

// ============================================================================
// WEATHER FORMATTING TESTS
// ============================================================================

describe('weather formatting', () => {
  const weatherCodes = [
    { code: 0, expected: 'Ensoleillé' },
    { code: 1, expected: 'Majoritairement clair' },
    { code: 2, expected: 'Partiellement nuageux' },
    { code: 3, expected: 'Nuageux' },
    { code: 45, expected: 'Brouillard' },
    { code: 51, expected: 'Bruine' },
    { code: 61, expected: 'Pluie' },
    { code: 71, expected: 'Neige' },
    { code: 80, expected: 'Averses' },
    { code: 95, expected: 'Orage' },
    { code: 999, expected: 'Inconnu' },
  ];

  it.each(weatherCodes)('formats weather code $code as "$expected"', ({ code, expected }) => {
    const session = createMockSession({
      weather: {
        temperature: 20,
        conditionCode: code,
        windSpeed: 5,
        precipitation: 0,
      },
    });
    const rows = formatSessionsStandard([session], true);

    expect(rows[0].meteo).toBe(expected);
  });

  it('rounds temperature values', () => {
    const session = createMockSession({
      weather: {
        temperature: 15.7,
        conditionCode: 0,
        windSpeed: 5,
        precipitation: 0,
      },
    });
    const rows = formatSessionsStandard([session], true);

    expect(rows[0].temperature).toBe('16');
  });

  it('formats precipitation with one decimal', () => {
    const session = createMockSession({
      weather: {
        temperature: 10,
        conditionCode: 61,
        windSpeed: 5,
        precipitation: 2.35,
      },
    });
    const rows = formatSessionsStandard([session], true);

    expect(rows[0].precipitations).toBe('2.4');
  });

  it('returns empty string for zero precipitation', () => {
    const session = createSessionWithWeather();
    const rows = formatSessionsStandard([session], true);

    expect(rows[0].precipitations).toBe('');
  });
});

// ============================================================================
// CSV GENERATION TESTS
// ============================================================================

describe('generateCSV', () => {
  it('generates CSV with headers and rows', () => {
    const headers = ['Nom', 'Age'];
    const rows = [
      { nom: 'Alice', age: 30 },
      { nom: 'Bob', age: 25 },
    ];

    const csv = generateCSV(headers, rows);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Nom,Age');
    expect(lines[1]).toBe('Alice,30');
    expect(lines[2]).toBe('Bob,25');
  });

  it('escapes values with commas', () => {
    const headers = ['Description'];
    const rows = [{ description: 'First, then second' }];

    const csv = generateCSV(headers, rows);

    expect(csv).toContain('"First, then second"');
  });

  it('escapes values with quotes', () => {
    const headers = ['Text'];
    const rows = [{ text: 'He said "hello"' }];

    const csv = generateCSV(headers, rows);

    expect(csv).toContain('"He said ""hello"""');
  });

  it('converts decimal points to commas for French Excel', () => {
    const headers = ['Distance'];
    const rows = [{ distance: '10.5' }];

    const csv = generateCSV(headers, rows);

    expect(csv).toContain('10,5');
  });

  it('handles null and undefined values', () => {
    const headers = ['Value'];
    const rows = [{ value: null }, { value: undefined }];

    const csv = generateCSV(headers, rows);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('');
  });
});

// ============================================================================
// JSON GENERATION TESTS
// ============================================================================

describe('generateJSON', () => {
  it('generates formatted JSON', () => {
    const rows = [{ name: 'Test', value: 123 }];

    const json = generateJSON(rows);

    expect(json).toBe(JSON.stringify(rows, null, 2));
  });

  it('handles empty array', () => {
    const json = generateJSON([]);

    expect(json).toBe('[]');
  });
});

// ============================================================================
// XLSX GENERATION TESTS
// ============================================================================

describe('generateXLSX', () => {
  it('generates a blob with xlsx mime type', async () => {
    const headers = ['Nom'];
    const rows = [{ nom: 'Alice' }];

    const blob = await generateXLSX(headers, rows);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});

// ============================================================================
// FILE DOWNLOAD TESTS
// ============================================================================

describe('downloadFile', () => {
  it('creates a link, clicks it, and revokes URL', () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadFile('content', 'file.csv', 'text/csv');

    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    vi.restoreAllMocks();
  });
});

describe('downloadBlob', () => {
  it('creates a link for blob download', () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadBlob(new Blob(['data']), 'file.xlsx');

    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    vi.restoreAllMocks();
  });
});

// ============================================================================
// FILENAME GENERATION TESTS
// ============================================================================

describe('generateExportFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15'));
  });

  it('generates CSV filename for standard mode', () => {
    const filename = generateExportFilename('csv', 'standard');

    expect(filename).toBe('seances_2024-03-15.csv');
  });

  it('generates CSV filename for detailed mode', () => {
    const filename = generateExportFilename('csv', 'detailed');

    expect(filename).toBe('seances_detaille_2024-03-15.csv');
  });

  it('generates JSON filename', () => {
    const filename = generateExportFilename('json', 'standard');

    expect(filename).toBe('seances_2024-03-15.json');
  });

  it('generates Excel filename', () => {
    const filename = generateExportFilename('excel', 'standard');

    expect(filename).toBe('seances_2024-03-15.xlsx');
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

// ============================================================================
// FILTER SESSIONS TESTS
// ============================================================================

describe('filterSessions', () => {
  const sessions: TrainingSession[] = [
    createMockSession({ id: '1', date: '2024-01-10', status: 'completed' }),
    createMockSession({ id: '2', date: '2024-01-20', status: 'completed' }),
    createMockSession({ id: '3', date: '2024-02-01', status: 'completed' }),
    createPlannedSession({ id: '4', date: null, status: 'planned' }),
    createPlannedSession({ id: '5', date: '2024-02-15', status: 'planned' }),
  ];

  const baseOptions: ExportOptions = {
    mode: 'standard',
    format: 'csv',
    includePlanned: true,
    includeWeather: false,
  };

  it('returns all sessions when no filters applied', () => {
    const filtered = filterSessions(sessions, baseOptions);

    expect(filtered).toHaveLength(5);
  });

  it('excludes planned sessions when includePlanned is false', () => {
    const filtered = filterSessions(sessions, {
      ...baseOptions,
      includePlanned: false,
    });

    expect(filtered).toHaveLength(3);
    expect(filtered.every(s => s.status === 'completed')).toBe(true);
  });

  it('filters by start date', () => {
    const filtered = filterSessions(sessions, {
      ...baseOptions,
      startDate: new Date('2024-01-15'),
    });

    // Should include sessions from Jan 20, Feb 1, Feb 15, and the planned one without date
    expect(filtered.some(s => s.id === '1')).toBe(false);
    expect(filtered.some(s => s.id === '2')).toBe(true);
  });

  it('filters by end date', () => {
    const filtered = filterSessions(sessions, {
      ...baseOptions,
      endDate: new Date('2024-01-25'),
    });

    // Should include Jan 10, Jan 20, and the planned one without date
    expect(filtered.some(s => s.id === '3')).toBe(false);
  });

  it('filters by date range', () => {
    const filtered = filterSessions(sessions, {
      ...baseOptions,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-25'),
    });

    // Only Jan 20 completed session and planned without date
    const completedFiltered = filtered.filter(s => s.status === 'completed');
    expect(completedFiltered).toHaveLength(1);
    expect(completedFiltered[0].id).toBe('2');
  });

  it('keeps planned sessions without date when filtering by date', () => {
    const filtered = filterSessions(sessions, {
      ...baseOptions,
      includePlanned: true,
      startDate: new Date('2024-01-15'),
    });

    // The planned session without date (id: 4) should still be included
    expect(filtered.some(s => s.id === '4')).toBe(true);
  });

  it('excludes planned sessions without date when includePlanned is false', () => {
    const filtered = filterSessions(sessions, {
      ...baseOptions,
      includePlanned: false,
    });

    expect(filtered.some(s => s.id === '4')).toBe(false);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('export integration', () => {
  it('generates complete CSV export', () => {
    const sessions = [
      createMockSession(),
      createSessionWithIntervals(),
      createSessionWithWeather(),
    ];

    const headers = getStandardHeaders(true);
    const rows = formatSessionsStandard(sessions, true);
    const csv = generateCSV(headers, rows);

    expect(csv).toContain('Numéro');
    expect(csv).toContain('Endurance');
    expect(csv).toContain('Interval');
    expect(csv).toContain('Ensoleillé');
  });

  it('generates complete JSON export with intervals', () => {
    const sessions = [createSessionWithIntervals()];

    const rows = formatSessionsDetailedJSON(sessions, false);
    const json = generateJSON(rows);
    const parsed = JSON.parse(json);

    expect(parsed[0].intervalles).toHaveLength(4);
    expect(parsed[0].intervalles[0].type).toBe('Échauffement');
  });
});
