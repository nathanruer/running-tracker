export function parseDate(dateStr: string): string {
  const datePatterns = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})$/,
  ];

  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      if (pattern === datePatterns[2]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  return '';
}

export function parseDuration(durationStr: string): string {
  const parts = durationStr.split(':');
  if (parts.length === 3) {
    return durationStr;
  } else if (parts.length === 2) {
    return `00:${durationStr}`;
  }
  return '00:00:00';
}

export function parsePace(allureStr: string): string {
  const paceMatch = allureStr.match(/(\d{1,2}):(\d{2})/);
  if (paceMatch) {
    return `${paceMatch[1].padStart(2, '0')}:${paceMatch[2]}`;
  }

  return '00:00';
}

export function parseNumber(numStr: string): number {
  if (!numStr || numStr.trim() === '') return 0;
  const cleaned = numStr.replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function detectColumns(headers: string[]): Map<string, string> {
  const columnMap = new Map<string, string>();

  headers.forEach((header) => {
    const normalizedHeader = header.toLowerCase().trim();

    if (!normalizedHeader) return;

    if (normalizedHeader.includes('date')) {
      columnMap.set('date', header);
    } else if (normalizedHeader.includes('séance') || normalizedHeader.includes('seance') || normalizedHeader === 'type') {
      columnMap.set('sessionType', header);
    } else if (normalizedHeader.includes('durée') || normalizedHeader.includes('duree') || normalizedHeader.includes('duration')) {
      columnMap.set('duration', header);
    } else if (normalizedHeader.includes('distance')) {
      columnMap.set('distance', header);
    } else if (normalizedHeader.includes('allure') || normalizedHeader.includes('pace')) {
      columnMap.set('avgPace', header);
    } else if (normalizedHeader.includes('fc') || normalizedHeader.includes('heart')) {
      columnMap.set('avgHeartRate', header);
    } else if (normalizedHeader.includes('rpe') || normalizedHeader === 'effort') {
      columnMap.set('perceivedExertion', header);
    } else if (normalizedHeader.includes('intervalle') || normalizedHeader.includes('interval') || normalizedHeader.includes('structure') || normalizedHeader.includes('fractionné') || normalizedHeader.includes('fractionne')) {
      columnMap.set('intervalStructure', header);
    } else if (normalizedHeader.includes('commentaire') || normalizedHeader.includes('comment')) {
      columnMap.set('comments', header);
    }
  });

  return columnMap;
}
