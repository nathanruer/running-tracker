import Papa from 'papaparse';
import {
  parseDate,
  normalizeCsvDuration,
  parsePace,
  parseNumber,
  detectColumns,
} from './csv-import-helpers';
import type { ParsedSession } from '@/features/import/components/csv-preview-table';

export interface ParseResult {
  sessions: ParsedSession[];
  error: string | null;
}

/**
 * Parses a JSON file and extracts training sessions
 *
 * @param file JSON file to parse
 * @returns Promise resolving to parsed sessions and any error
 *
 * @example
 * const result = await parseJsonFile(file);
 * if (result.error) {
 *   console.error(result.error);
 * } else {
 *   console.log(`Parsed ${result.sessions.length} sessions`);
 * }
 */
export async function parseJsonFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        const sessionsArray = Array.isArray(data) ? data : [data];

        const parsedSessions: ParsedSession[] = sessionsArray
          .map((row: Record<string, unknown>) => {
            const dateStr = String(row.date || row.Date || '');
            const sessionType = String(
              row.sessionType || row.type || row['Type de séance'] || ''
            ).trim();
            const duration = normalizeCsvDuration(
              String(row.duration || row.duree || row['Durée'] || '00:00:00')
            );
            const distance = parseNumber(
              String(row.distance || row.distance_km || row['Distance (km)'] || '0')
            );

            const allureRaw = String(
              row.avgPace || row.allure_min_km || row['Allure (mn/km)'] || '00:00'
            );
            const avgPace = parsePace(allureRaw);

            const avgHeartRate = Math.round(
              parseNumber(
                String(row.avgHeartRate || row.fc_moyenne_bpm || row['FC moyenne (bpm)'] || '0')
              )
            );
            const perceivedExertion = row.perceivedExertion || row.rpe
              ? Math.round(parseNumber(String(row.perceivedExertion || row.rpe || 0)))
              : undefined;
            const comments = String(row.comments || row.commentaires || '').trim();

            let intervalDetails: string | null = null;
            const intervalDetailsRaw = row.intervalDetails || row.details_intervalle || null;
            if (intervalDetailsRaw) {
              intervalDetails =
                typeof intervalDetailsRaw === 'string'
                  ? intervalDetailsRaw
                  : JSON.stringify(intervalDetailsRaw);
            } else if (row.structure_intervalle) {
              intervalDetails = String(row.structure_intervalle);
            }

            return {
              date: parseDate(dateStr),
              sessionType,
              duration,
              distance,
              avgPace,
              avgHeartRate,
              perceivedExertion,
              comments,
              intervalDetails,
            };
          })
          .filter((session) => session.date && session.sessionType);

        if (parsedSessions.length === 0) {
          resolve({
            sessions: [],
            error: 'Aucune séance valide trouvée dans le fichier JSON.',
          });
        } else {
          resolve({ sessions: parsedSessions, error: null });
        }
      } catch (err) {
        console.error(err);
        resolve({
          sessions: [],
          error: 'Erreur lors de la lecture du fichier JSON.',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        sessions: [],
        error: 'Erreur lors de la lecture du fichier.',
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Parses a CSV file and extracts training sessions
 *
 * @param file CSV file to parse
 * @returns Promise resolving to parsed sessions and any error
 *
 * @example
 * const result = await parseCsvFile(file);
 * if (result.error) {
 *   console.error(result.error);
 * } else {
 *   console.log(`Parsed ${result.sessions.length} sessions`);
 * }
 */
export async function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const columnMap = detectColumns(headers);

          const parsedSessions: ParsedSession[] = (results.data as Record<string, string>[])
            .map((row) => {
              const date = columnMap.has('date')
                ? parseDate(row[columnMap.get('date')!] || '')
                : '';
              const sessionType = columnMap.has('sessionType')
                ? (row[columnMap.get('sessionType')!] || '').trim()
                : '';
              const duration = columnMap.has('duration')
                ? normalizeCsvDuration(row[columnMap.get('duration')!] || '00:00:00')
                : '00:00:00';
              const distance = columnMap.has('distance')
                ? parseNumber(row[columnMap.get('distance')!] || '0')
                : 0;

              const allureRaw = columnMap.has('avgPace')
                ? row[columnMap.get('avgPace')!] || '00:00'
                : '00:00';
              const avgPace = parsePace(allureRaw);

              let intervalDetails: string | null = null;
              if (columnMap.has('intervalStructure')) {
                const structureStr = (row[columnMap.get('intervalStructure')!] || '').trim();
                if (structureStr) {
                  intervalDetails = structureStr;
                }
              }

              const avgHeartRate = columnMap.has('avgHeartRate')
                ? Math.round(parseNumber(row[columnMap.get('avgHeartRate')!] || '0'))
                : 0;
              const rpeValue = columnMap.has('perceivedExertion')
                ? (row[columnMap.get('perceivedExertion')!] || '').trim()
                : '';
              const perceivedExertion = rpeValue ? Math.round(parseNumber(rpeValue)) : undefined;
              const comments = columnMap.has('comments')
                ? (row[columnMap.get('comments')!] || '').trim()
                : '';

              return {
                date,
                sessionType,
                duration,
                distance,
                avgPace,
                avgHeartRate,
                perceivedExertion,
                comments,
                intervalDetails,
              };
            })
            .filter((session) => session.date && session.sessionType);

          if (parsedSessions.length === 0) {
            resolve({
              sessions: [],
              error:
                'Aucune séance valide trouvée dans le fichier. Vérifiez que les colonnes Date et Séance sont présentes.',
            });
          } else {
            resolve({ sessions: parsedSessions, error: null });
          }
        } catch {
          resolve({
            sessions: [],
            error: "Erreur lors de l'analyse du fichier. Vérifiez le format.",
          });
        }
      },
      error: () => {
        resolve({
          sessions: [],
          error: 'Erreur lors de la lecture du fichier.',
        });
      },
    });
  });
}

/**
 * Parses a file (CSV or JSON) and extracts training sessions
 * Automatically detects file type based on extension and MIME type
 *
 * @param file File to parse (CSV or JSON)
 * @returns Promise resolving to parsed sessions and any error
 *
 * @example
 * const result = await parseTrainingFile(file);
 * if (result.error) {
 *   handleError(result.error);
 * } else {
 *   setPreview(result.sessions);
 * }
 */
export async function parseTrainingFile(file: File): Promise<ParseResult> {
  const isJson = file.type === 'application/json' || file.name.endsWith('.json');

  if (isJson) {
    return parseJsonFile(file);
  } else {
    return parseCsvFile(file);
  }
}
