import { describe, it, expect, vi } from 'vitest';
import {
  formatWeeklyData,
  getWeeklyHeaders,
  generateWeeklyCSV,
  generateWeeklyJSON,
  generateWeeklyXLSX,
} from '../weekly-export';

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn(() => ({ sheet: true })),
    book_new: vi.fn(() => ({ sheets: [] })),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

const sampleWeek = {
  label: 'S01',
  weekKey: '2024-01',
  trainingWeek: 1,
  km: 42.5,
  plannedKm: 50,
  totalWithPlanned: 92.5,
  completedCount: 4,
  plannedCount: 5,
  durationSeconds: 3600,
  avgPaceSeconds: 300,
  avgHeartRate: 150,
  changePercent: -10,
  changePercentWithPlanned: -15,
  gapWeeks: 0,
  isActive: true,
  weekStart: new Date('2024-01-01'),
  weekEnd: new Date('2024-01-07'),
};

describe('weekly-export', () => {
  it('formats weekly data with evolution and durations', () => {
    const rows = formatWeeklyData([sampleWeek]);

    expect(rows[0]).toMatchObject({
      semaine: 'S01',
      distance_realisee_km: 42.5,
      distance_prevue_km: 50,
      gap_distance_km: -7.5,
      seances_realisees: 4,
      seances_prevues: 5,
      duree_totale: '01:00:00',
      allure_moyenne: '05:00',
      fc_moyenne: 150,
      evolution_pourcent: '-15.0',
    });
  });

  it('returns headers in expected order', () => {
    const headers = getWeeklyHeaders();
    expect(headers[0]).toBe('Semaine');
    expect(headers[headers.length - 1]).toBe('Évolution (%)');
  });

  it('generates CSV with french decimal and escaping', () => {
    const rows = formatWeeklyData([{ ...sampleWeek, label: 'S,02', avgHeartRate: 0 }]);
    const csv = generateWeeklyCSV(rows);

    expect(csv).toContain('Semaine');
    expect(csv).toContain('\"S,02\"');
    expect(csv).toContain('\"42,5\"');
  });

  it('generates JSON output', () => {
    const rows = formatWeeklyData([sampleWeek]);
    const json = generateWeeklyJSON(rows);
    expect(JSON.parse(json)[0].semaine).toBe('S01');
  });

  it('generates XLSX blob', () => {
    const rows = formatWeeklyData([sampleWeek]);
    const blob = generateWeeklyXLSX(rows);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('formats evolution when only completed sessions exist', () => {
    const rows = formatWeeklyData([{
      ...sampleWeek,
      plannedKm: 0,
      plannedCount: 0,
      changePercent: 12.345,
      changePercentWithPlanned: null,
    }]);

    expect(rows[0].evolution_pourcent).toBe('+12.3');
  });

  it('formats evolution when only planned sessions exist', () => {
    const rows = formatWeeklyData([{
      ...sampleWeek,
      km: 0,
      completedCount: 0,
      changePercent: null,
      changePercentWithPlanned: -4.9,
    }]);

    expect(rows[0].evolution_pourcent).toBe('-4.9');
  });

  it('formats evolution when no sessions exist', () => {
    const rows = formatWeeklyData([{
      ...sampleWeek,
      km: 0,
      plannedKm: 0,
      completedCount: 0,
      plannedCount: 0,
      changePercent: null,
      changePercentWithPlanned: null,
    }]);

    expect(rows[0].evolution_pourcent).toBe('');
  });
});
