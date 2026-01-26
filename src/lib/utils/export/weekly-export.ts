import * as XLSX from 'xlsx';
import { type WeeklyChartDataPoint } from '@/lib/domain/analytics/weekly-calculator';
import { formatDuration } from '@/lib/utils/duration/format';

export type ExportFormat = 'csv' | 'json' | 'excel';

export interface WeeklyExportRow {
  semaine: string;
  distance_realisee_km: number;
  distance_prevue_km: number;
  gap_distance_km: number;
  seances_realisees: number;
  seances_prevues: number;
  duree_totale: string;
  allure_moyenne: string;
  fc_moyenne: number | string;
  evolution_pourcent: string;
}

/**
 * Formats weekly data for export
 */
export function formatWeeklyData(data: WeeklyChartDataPoint[]): WeeklyExportRow[] {
  return data.map((week) => {
    const hasCompleted = week.km > 0;
    const hasPlanned = week.plannedKm > 0;

    let evolution = '';
    if (hasCompleted && hasPlanned) {
      evolution = week.changePercentWithPlanned !== null
        ? `${week.changePercentWithPlanned > 0 ? '+' : ''}${week.changePercentWithPlanned.toFixed(1)}`
        : '';
    } else if (hasCompleted) {
      evolution = week.changePercent !== null
        ? `${week.changePercent > 0 ? '+' : ''}${week.changePercent.toFixed(1)}`
        : '';
    } else if (hasPlanned) {
      evolution = week.changePercentWithPlanned !== null
        ? `${week.changePercentWithPlanned > 0 ? '+' : ''}${week.changePercentWithPlanned.toFixed(1)}`
        : '';
    }

    return {
      semaine: week.label,
      distance_realisee_km: week.km,
      distance_prevue_km: week.plannedKm,
      gap_distance_km: Number((week.km - week.plannedKm).toFixed(1)),
      seances_realisees: week.completedCount,
      seances_prevues: week.plannedCount,
      duree_totale: week.durationSeconds > 0 ? formatDuration(week.durationSeconds) : '',
      allure_moyenne: week.avgPaceSeconds ? formatDuration(week.avgPaceSeconds) : '',
      fc_moyenne: week.avgHeartRate || '',
      evolution_pourcent: evolution,
    };
  });
}

/**
 * Gets headers for weekly export
 */
export function getWeeklyHeaders(): string[] {
  return [
    'Semaine',
    'Distance réalisée (km)',
    'Distance prévue (km)',
    'Écart distance (km)',
    'Séances réalisées',
    'Séances prévues',
    'Durée totale',
    'Allure moyenne (min/km)',
    'FC moyenne (bpm)',
    'Évolution (%)',
  ];
}

/**
 * Generates CSV content
 */
export function generateWeeklyCSV(rows: WeeklyExportRow[]): string {
  const headers = getWeeklyHeaders();
  
  const csvRows = rows.map((row) => {
    return [
      row.semaine,
      row.distance_realisee_km,
      row.distance_prevue_km,
      row.gap_distance_km,
      row.seances_realisees,
      row.seances_prevues,
      row.duree_totale,
      row.allure_moyenne,
      row.fc_moyenne,
      row.evolution_pourcent,
    ].map(cell => {
      let cellStr = String(cell ?? '');
      // Handle French Excel: replace . with , in numbers
      if (/^\d+\.\d+$/.test(cellStr)) {
        cellStr = cellStr.replace('.', ',');
      }
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',');
  });

  return [headers.join(','), ...csvRows].join('\n');
}

/**
 * Generates regular Excel (.xlsx) file
 */
export function generateWeeklyXLSX(rows: WeeklyExportRow[]): Blob {
  const headers = getWeeklyHeaders();
  const worksheetData = [
    headers,
    ...rows.map((row) => [
      row.semaine,
      row.distance_realisee_km,
      row.distance_prevue_km,
      row.gap_distance_km,
      row.seances_realisees,
      row.seances_prevues,
      row.duree_totale,
      row.allure_moyenne,
      row.fc_moyenne,
      row.evolution_pourcent,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Analyse Hebdomadaire');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generates JSON content
 */
export function generateWeeklyJSON(rows: WeeklyExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}
