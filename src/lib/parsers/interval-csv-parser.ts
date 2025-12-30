import { normalizeDurationToMMSS, normalizePaceFormat } from '@/lib/utils/duration';

export interface IntervalCSVRow {
  intervalNumber: string;
  stepType: string;
  duration: string;
  distance: string;
  avgPace: string;
  avgHeartRate: string;
  maxHeartRate: string;
}

export interface ParsedIntervalStep {
  stepNumber: number;
  stepType: 'warmup' | 'effort' | 'recovery' | 'cooldown';
  duration: string | null;
  distance: number | null;
  pace: string | null;
  hr: number | null;
}

export interface IntervalCSVParseResult {
  steps: ParsedIntervalStep[];
  repetitionCount: number;
  totalDuration: string;
  totalDistance: number;
  avgPace: string;
  avgHeartRate: number;
}

function getBaseStepType(garminType: string): 'effort' | 'recovery' {
  const normalized = garminType.toLowerCase().trim();

  if (normalized.includes('repos') ||
      normalized.includes('rest') ||
      normalized.includes('récupération') ||
      normalized.includes('recovery')) {
    return 'recovery';
  }

  return 'effort';
}

function durationToMinutes(duration: string): number {
  if (!duration || duration === '--') return 0;

  const parts = duration.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]);
  }
  if (parts.length === 3) {
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    return hours * 60 + minutes;
  }
  return 0;
}


export function parseIntervalCSV(csvContent: string): IntervalCSVParseResult | null {
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    return null;
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  };

  const headers = parseLine(lines[0]);

  const stepTypeCol = headers.findIndex(h => h.toLowerCase().includes('type') && h.toLowerCase().includes('étape'));
  const durationCol = headers.findIndex(h => h.toLowerCase() === 'durée' || h.toLowerCase() === 'duration');
  const distanceCol = headers.findIndex(h => h.toLowerCase() === 'distance');
  const paceCol = headers.findIndex(h => h.toLowerCase().includes('allure moyenne') || h.toLowerCase().includes('avg pace'));
  const hrCol = headers.findIndex(h => h.toLowerCase().includes('fréquence cardiaque moyenne') || h.toLowerCase().includes('avg heart rate'));

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    rows.push(row);
  }

  const dataRows = rows.filter(row => {
    const stepType = row[stepTypeCol] || '';
    return !stepType.toLowerCase().includes('récapitulatif') &&
           !stepType.toLowerCase().includes('summary') &&
           stepType !== '--';
  });

  if (dataRows.length === 0) {
    return null;
  }

  interface TempStep {
    garminType: string;
    duration: string;
    baseType: 'effort' | 'recovery';
    distance: number | null;
    pace: string | null;
    hr: number | null;
  }

  const tempSteps: TempStep[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const garminType = row[stepTypeCol] || '';
    const baseType = getBaseStepType(garminType);
    const durationStr = row[durationCol] || '';
    const distanceStr = row[distanceCol] || '';
    const distance = distanceStr ? parseFloat(distanceStr) : null;
    const paceRaw = row[paceCol] || null;
    const pace = paceRaw && paceRaw !== '--' ? normalizePaceFormat(paceRaw.split('.')[0].trim()) : null;
    const hrStr = row[hrCol] || '';
    const hr = hrStr ? parseInt(hrStr) : null;

    tempSteps.push({
      garminType,
      duration: durationStr,
      baseType,
      distance,
      pace,
      hr,
    });
  }

  const steps: ParsedIntervalStep[] = [];
  let effortCount = 0;

  for (let i = 0; i < tempSteps.length; i++) {
    const temp = tempSteps[i];
    let finalType: 'warmup' | 'effort' | 'recovery' | 'cooldown' = temp.baseType;

    const isFirst = i === 0;
    const isLast = i === tempSteps.length - 1;
    const durationMinutes = durationToMinutes(temp.duration);
    const garminTypeLower = temp.garminType.toLowerCase();

    if (isFirst && tempSteps.length > 1) {
      if ((temp.baseType === 'effort' && durationMinutes < 15) ||
          (temp.baseType === 'recovery' && durationMinutes < 10)) {
        if (garminTypeLower.includes('échauffement') ||
            garminTypeLower.includes('warmup') ||
            garminTypeLower.includes('warm-up')) {
          finalType = 'warmup';
        }
      }
    }

    if (isLast && temp.baseType === 'recovery') {
      if (durationMinutes > 5 ||
          garminTypeLower.includes('récupération finale') ||
          (garminTypeLower.includes('récupération') && !garminTypeLower.includes('repos'))) {
        finalType = 'cooldown';
      }
    }

    if (finalType === 'effort') {
      effortCount++;
    }

    const duration = temp.duration && temp.duration !== '--'
      ? normalizeDurationToMMSS(temp.duration, { convertHoursToMinutes: true })
      : null;

    steps.push({
      stepNumber: i + 1,
      stepType: finalType,
      duration,
      distance: temp.distance,
      pace: temp.pace,
      hr: temp.hr,
    });
  }

  const summaryRow = rows[rows.length - 1];
  const totalDurationRaw = summaryRow[durationCol] || '00:00';
  const totalDuration = totalDurationRaw && totalDurationRaw !== '--'
    ? normalizeDurationToMMSS(totalDurationRaw, { convertHoursToMinutes: true }) || '00:00'
    : '00:00';
  const totalDistanceStr = summaryRow[distanceCol] || '0';
  const totalDistance = parseFloat(totalDistanceStr);
  const avgPaceRaw = summaryRow[paceCol] || '00:00';
  const avgPace = avgPaceRaw && avgPaceRaw !== '--'
    ? normalizePaceFormat(avgPaceRaw.split('.')[0].trim()) || '00:00'
    : '00:00';
  const avgHRStr = summaryRow[hrCol] || '0';
  const avgHeartRate = parseInt(avgHRStr);

  return {
    steps,
    repetitionCount: effortCount,
    totalDuration,
    totalDistance,
    avgPace,
    avgHeartRate,
  };
}
