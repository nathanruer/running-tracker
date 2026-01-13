/**
 * Session export utilities
 * Handles formatting and exporting training sessions in various formats (CSV, JSON, Excel)
 * Supports both standard (one line per session) and detailed (one line per interval) exports
 */

import * as XLSX from 'xlsx';
import { type TrainingSession, type IntervalStep } from '@/lib/types';
import { generateIntervalStructure } from '@/lib/utils/intervals';
import { getSessionDisplayData } from '@/lib/domain/forms/session-helpers';

export type ExportMode = 'standard' | 'detailed';
export type ExportFormat = 'csv' | 'json' | 'excel';

export interface ExportOptions {
  mode: ExportMode;
  format: ExportFormat;
  includePlanned: boolean;
  includeWeather: boolean;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// WEATHER FORMATTING
// ============================================================================

/**
 * Formats weather condition code to French description (WMO codes)
 * Uses the same logic as getWeatherLabel from weather.ts
 */
function formatWeatherCondition(code: number | null | undefined): string {
  if (code === null || code === undefined) return '';

  if (code === 0) return 'Ensoleillé';
  if (code === 1) return 'Majoritairement clair';
  if (code === 2) return 'Partiellement nuageux';
  if (code === 3) return 'Nuageux';
  if (code >= 45 && code <= 48) return 'Brouillard';
  if (code >= 51 && code <= 55) return 'Bruine';
  if (code >= 61 && code <= 65) return 'Pluie';
  if (code >= 71 && code <= 75) return 'Neige';
  if (code >= 80 && code <= 82) return 'Averses';
  if (code >= 95 && code <= 99) return 'Orage';

  return 'Inconnu';
}

/**
 * Formats temperature (number only for CSV/Excel)
 */
function formatTemperature(temp: number | null | undefined): string {
  if (temp === null || temp === undefined) return '';
  return String(Math.round(temp));
}

/**
 * Formats wind speed (number only for CSV/Excel)
 */
function formatWindSpeed(speed: number | null | undefined): string {
  if (speed === null || speed === undefined) return '';
  return String(Math.round(speed));
}

/**
 * Formats precipitation (number only for CSV/Excel, empty if 0)
 */
function formatPrecipitation(precip: number | null | undefined): string {
  if (precip === null || precip === undefined || precip === 0) return '';
  return precip.toFixed(1);
}

/**
 * Formats temperature with unit (for JSON export)
 */
function formatTemperatureWithUnit(temp: number | null | undefined): string {
  if (temp === null || temp === undefined) return '';
  return `${Math.round(temp)}°C`;
}

/**
 * Formats wind speed with unit (for JSON export)
 */
function formatWindSpeedWithUnit(speed: number | null | undefined): string {
  if (speed === null || speed === undefined) return '';
  return `${Math.round(speed)} km/h`;
}

/**
 * Formats precipitation with unit (for JSON export)
 */
function formatPrecipitationWithUnit(precip: number | null | undefined): string {
  if (precip === null || precip === undefined || precip === 0) return '';
  return `${precip.toFixed(1)} mm`;
}

// ============================================================================
// STANDARD EXPORT (one line per session)
// ============================================================================

interface StandardExportRow extends Record<string, unknown> {
  numero: number;
  semaine: number | null;
  date: string;
  type: string;
  duree: string;
  distance: number;
  allure: string;
  fc_moyenne: number;
  rpe: number | string;
  structure_intervalle: string;
  temperature?: string;
  meteo?: string;
  vent?: string;
  precipitations?: string;
  commentaires: string;
}

/**
 * Converts sessions to standard export format (one row per session)
 */
export function formatSessionsStandard(
  sessions: TrainingSession[],
  includeWeather: boolean
): StandardExportRow[] {
  return sessions.map((session) => {
    const data = getSessionDisplayData(session);
    
    const row = {
      numero: session.sessionNumber,
      semaine: session.week,
      date: session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '',
      type: session.sessionType,
      duree: data.duration,
      distance: data.distance,
      allure: data.avgPace,
      fc_moyenne: data.avgHeartRate,
      rpe: data.rpe,
      structure_intervalle: generateIntervalStructure(session.intervalDetails) || '',
    };

    if (includeWeather) {
      if (session.weather) {
        (row as StandardExportRow).temperature = formatTemperature(session.weather.temperature);
        (row as StandardExportRow).meteo = formatWeatherCondition(session.weather.conditionCode);
        (row as StandardExportRow).vent = formatWindSpeed(session.weather.windSpeed);
        (row as StandardExportRow).precipitations = formatPrecipitation(session.weather.precipitation);
      } else {
        (row as StandardExportRow).temperature = '';
        (row as StandardExportRow).meteo = '';
        (row as StandardExportRow).vent = '';
        (row as StandardExportRow).precipitations = '';
      }
    }

    (row as StandardExportRow).commentaires = session.comments || '';

    return row as StandardExportRow;
  });
}

/**
 * Gets CSV headers for standard export
 */
export function getStandardHeaders(includeWeather: boolean): string[] {
  const baseHeaders = [
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
  ];

  if (includeWeather) {
    baseHeaders.push('Température (°C)', 'Météo', 'Vent (km/h)', 'Précipitations (mm)');
  }

  baseHeaders.push('Commentaires');

  return baseHeaders;
}

// ============================================================================
// DETAILED EXPORT (one line per session with JSON intervals)
// ============================================================================

interface DetailedExportRow extends Record<string, unknown> {
  numero: number;
  semaine: number | null;
  date: string;
  type: string;
  duree: string;
  distance: number;
  allure: string;
  fc_moyenne: number;
  rpe: number | string;
  intervalles: string;
  temperature?: string;
  meteo?: string;
  vent?: string;
  precipitations?: string;
  commentaires: string;
}

/**
 * Formats step type to French
 */
function formatStepType(stepType: IntervalStep['stepType']): string {
  const labels: Record<typeof stepType, string> = {
    warmup: 'Échauffement',
    effort: 'Effort',
    recovery: 'Récupération',
    cooldown: 'Retour calme',
  };
  return labels[stepType];
}

/**
 * Formats step type to French (short version)
 */
function formatStepTypeShort(stepType: IntervalStep['stepType']): string {
  const labels: Record<typeof stepType, string> = {
    warmup: 'Échauff',
    effort: 'Effort',
    recovery: 'Récup',
    cooldown: 'Ret.calme',
  };
  return labels[stepType];
}

/**
 * Formats intervals to condensed text for CSV/Excel (one column)
 * Example: "1.Échauff(12:18, 1.78km, 6:55, 138bpm) | 2.Effort(08:00, 1.49km, 5:22, 166bpm)"
 */
function formatIntervalsToText(steps: IntervalStep[]): string {
  return steps
    .map((step) => {
      const parts = [
        step.duration || '',
        step.distance ? `${step.distance}km` : '',
        step.pace || '',
        step.hr ? `${step.hr}bpm` : '',
      ].filter(Boolean);

      return `${step.stepNumber}.${formatStepTypeShort(step.stepType)}(${parts.join(', ')})`;
    })
    .join(' | ');
}

/**
 * Converts sessions to detailed export format for CSV/Excel (one row per session with text intervals)
 * Sessions with interval details have them formatted as condensed text in a single column
 */
export function formatSessionsDetailed(
  sessions: TrainingSession[],
  includeWeather: boolean
): DetailedExportRow[] {
  return sessions.map((session) => {
    const data = getSessionDisplayData(session);
    
    let intervalsText = '';
    const hasIntervals =
      session.intervalDetails &&
      session.intervalDetails.steps &&
      session.intervalDetails.steps.length > 0;

    if (hasIntervals && session.intervalDetails?.steps) {
      intervalsText = formatIntervalsToText(session.intervalDetails.steps);
    }

    const row = {
      numero: session.sessionNumber,
      semaine: session.week,
      date: session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '',
      type: session.sessionType,
      duree: data.duration,
      distance: data.distance,
      allure: data.avgPace,
      fc_moyenne: data.avgHeartRate,
      rpe: data.rpe,
      intervalles: intervalsText,
    };

    if (includeWeather) {
      if (session.weather) {
        (row as DetailedExportRow).temperature = formatTemperature(session.weather.temperature);
        (row as DetailedExportRow).meteo = formatWeatherCondition(session.weather.conditionCode);
        (row as DetailedExportRow).vent = formatWindSpeed(session.weather.windSpeed);
        (row as DetailedExportRow).precipitations = formatPrecipitation(session.weather.precipitation);
      } else {
        (row as DetailedExportRow).temperature = '';
        (row as DetailedExportRow).meteo = '';
        (row as DetailedExportRow).vent = '';
        (row as DetailedExportRow).precipitations = '';
      }
    }

    (row as DetailedExportRow).commentaires = session.comments || '';

    return row as DetailedExportRow;
  });
}

/**
 * Gets CSV headers for detailed export
 */
export function getDetailedHeaders(includeWeather: boolean): string[] {
  const baseHeaders = [
    'Numéro',
    'Semaine',
    'Date',
    'Type de séance',
    'Durée',
    'Distance (km)',
    'Allure (min/km)',
    'FC moyenne (bpm)',
    'RPE',
    'Intervalles',
  ];

  if (includeWeather) {
    baseHeaders.push('Température (°C)', 'Météo', 'Vent (km/h)', 'Précipitations (mm)');
  }

  baseHeaders.push('Commentaires');

  return baseHeaders;
}

// ============================================================================
// JSON-SPECIFIC EXPORT
// ============================================================================

interface StandardJSONExportRow {
  numero: number;
  semaine: number | null;
  date: string;
  type: string;
  duree: string;
  distance: number;
  allure: string;
  fc_moyenne: number;
  rpe: number | null;
  structure_intervalle: string;
  temperature?: string;
  meteo?: string;
  vent?: string;
  precipitations?: string;
  commentaires: string;
}

interface DetailedJSONExportRow {
  numero: number;
  semaine: number | null;
  date: string;
  type: string;
  duree: string;
  distance: number;
  allure: string;
  fc_moyenne: number;
  rpe: number | null;
  intervalles: Array<{
    num: number;
    type: string;
    duree: string;
    distance: number;
    allure: string;
    fc: number;
  }> | null;
  temperature?: string;
  meteo?: string;
  vent?: string;
  precipitations?: string;
  commentaires: string;
}

/**
 * Converts sessions to standard export format for JSON
 */
export function formatSessionsStandardJSON(
  sessions: TrainingSession[],
  includeWeather: boolean
): StandardJSONExportRow[] {
  return sessions.map((session) => {
    const data = getSessionDisplayData(session);
    
    const row = {
      numero: session.sessionNumber,
      semaine: session.week,
      date: session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '',
      type: session.sessionType,
      duree: data.duration,
      distance: data.distance,
      allure: data.avgPace,
      fc_moyenne: data.avgHeartRate,
      rpe: data.rpe || null,
      structure_intervalle: generateIntervalStructure(session.intervalDetails) || '',
    };

    if (includeWeather) {
      if (session.weather) {
        (row as StandardJSONExportRow).temperature = formatTemperatureWithUnit(session.weather.temperature);
        (row as StandardJSONExportRow).meteo = formatWeatherCondition(session.weather.conditionCode);
        (row as StandardJSONExportRow).vent = formatWindSpeedWithUnit(session.weather.windSpeed);
        (row as StandardJSONExportRow).precipitations = formatPrecipitationWithUnit(session.weather.precipitation);
      } else {
        (row as StandardJSONExportRow).temperature = '';
        (row as StandardJSONExportRow).meteo = '';
        (row as StandardJSONExportRow).vent = '';
        (row as StandardJSONExportRow).precipitations = '';
      }
    }

    (row as StandardJSONExportRow).commentaires = session.comments || '';

    return row as StandardJSONExportRow;
  });
}

/**
 * Converts sessions to detailed export format for JSON (with native interval objects)
 */
export function formatSessionsDetailedJSON(
  sessions: TrainingSession[],
  includeWeather: boolean
): DetailedJSONExportRow[] {
  return sessions.map((session) => {
    const data = getSessionDisplayData(session);
    
    let intervals = null;
    const hasIntervals =
      session.intervalDetails &&
      session.intervalDetails.steps &&
      session.intervalDetails.steps.length > 0;

    if (hasIntervals && session.intervalDetails?.steps) {
      intervals = session.intervalDetails.steps.map((step) => ({
        num: step.stepNumber,
        type: formatStepType(step.stepType),
        duree: step.duration || '',
        distance: step.distance || 0,
        allure: step.pace || '',
        fc: step.hr || 0,
      }));
    }

    const row = {
      numero: session.sessionNumber,
      semaine: session.week,
      date: session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '',
      type: session.sessionType,
      duree: data.duration,
      distance: data.distance,
      allure: data.avgPace,
      fc_moyenne: data.avgHeartRate,
      rpe: data.rpe || null,
      intervalles: intervals,
    };

    if (includeWeather) {
      if (session.weather) {
        (row as DetailedJSONExportRow).temperature = formatTemperatureWithUnit(session.weather.temperature);
        (row as DetailedJSONExportRow).meteo = formatWeatherCondition(session.weather.conditionCode);
        (row as DetailedJSONExportRow).vent = formatWindSpeedWithUnit(session.weather.windSpeed);
        (row as DetailedJSONExportRow).precipitations = formatPrecipitationWithUnit(session.weather.precipitation);
      } else {
        (row as DetailedJSONExportRow).temperature = '';
        (row as DetailedJSONExportRow).meteo = '';
        (row as DetailedJSONExportRow).vent = '';
        (row as DetailedJSONExportRow).precipitations = '';
      }
    }

    (row as DetailedJSONExportRow).commentaires = session.comments || '';

    return row as DetailedJSONExportRow;
  });
}

// ============================================================================
// CSV GENERATION
// ============================================================================

/**
 * Escapes CSV cell value (handles commas, quotes, newlines)
 * Converts decimal points to commas for French Excel compatibility
 */
function escapeCsvCell(value: unknown): string {
  let cellStr = String(value ?? '');

  if (!cellStr) return '';

  if (/^\d+\.\d+$/.test(cellStr)) {
    cellStr = cellStr.replace('.', ',');
  }

  if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
    return `"${cellStr.replace(/"/g, '""')}"`;
  }

  return cellStr;
}

/**
 * Generates CSV content from rows
 */
export function generateCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const csvRows = rows.map((row) =>
    Object.values(row)
      .map((cell) => escapeCsvCell(cell))
      .join(',')
  );

  return [headers.join(','), ...csvRows].join('\n');
}

// ============================================================================
// EXCEL (.XLSX) GENERATION
// ============================================================================

/**
 * Generates a real Excel .xlsx file from rows
 * Returns a Blob that can be downloaded
 */
export function generateXLSX(headers: string[], rows: Record<string, unknown>[]): Blob {
  const worksheetData = [
    headers,
    ...rows.map((row) => Object.values(row)),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Séances');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ============================================================================
// JSON GENERATION
// ============================================================================

/**
 * Generates JSON content from rows
 */
export function generateJSON(rows: unknown[]): string {
  return JSON.stringify(rows, null, 2);
}

// ============================================================================
// FILE DOWNLOAD
// ============================================================================

/**
 * Downloads content as a file (string content)
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const bom = mimeType.includes('json') ? '' : '\ufeff';
  const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Downloads a Blob as a file (for binary content like .xlsx)
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generates filename for export
 */
export function generateExportFilename(format: ExportFormat, mode: ExportMode): string {
  const date = new Date().toISOString().split('T')[0];
  const modeStr = mode === 'detailed' ? '_detaille' : '';
  const extensions: Record<ExportFormat, string> = {
    csv: 'csv',
    json: 'json',
    excel: 'xlsx',
  };

  return `seances${modeStr}_${date}.${extensions[format]}`;
}

// ============================================================================
// FILTER SESSIONS
// ============================================================================

/**
 * Filters sessions based on export options
 */
export function filterSessions(
  sessions: TrainingSession[],
  options: ExportOptions
): TrainingSession[] {
  let filtered = sessions;

  if (!options.includePlanned) {
    filtered = filtered.filter((s) => s.status === 'completed');
  }

  if (options.startDate) {
    filtered = filtered.filter((s) => {
      if (options.includePlanned && s.status === 'planned' && !s.date) {
        return true;
      }
      return s.date && new Date(s.date) >= options.startDate!;
    });
  }

  if (options.endDate) {
    filtered = filtered.filter((s) => {
      if (options.includePlanned && s.status === 'planned' && !s.date) {
        return true;
      }
      return s.date && new Date(s.date) <= options.endDate!;
    });
  }

  if (!options.includePlanned) {
    filtered = filtered.filter((s) => s.date);
  } else {
    filtered = filtered.filter((s) => s.date || s.status === 'planned');
  }

  return filtered;
}
