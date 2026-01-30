import { IntervalDetails, IntervalStep, StepType } from '@/lib/types/session';

export function parseGarminCSV(csvContent: string): IntervalDetails | null {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return null;

  const headers = lines[0].replace(/"/g, '').split(',');
  
  const typeIndex = headers.indexOf("Type d'étape");
  const durationIndex = headers.indexOf("Durée");
  const distanceIndex = headers.indexOf("Distance");
  const paceIndex = headers.indexOf("Allure moyenne");
  const hrIndex = headers.indexOf("Fréquence cardiaque moyenne");

  if (typeIndex === -1 || durationIndex === -1) {
    return null;
  }

  const steps: IntervalStep[] = [];
  let stepNumber = 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    
    if (values.length < headers.length) continue;

    const typeRaw = values[typeIndex];
    if (typeRaw === '--' || values[0] === 'Jours') continue;

    const stepType = mapStepType(typeRaw);
    if (!stepType) continue;

    const durationRaw = values[durationIndex];
    const duration = formatDuration(durationRaw);

    const distanceRaw = values[distanceIndex];
    const distance = parseFloat(distanceRaw);

    const pace = values[paceIndex];

    const hrRaw = values[hrIndex];
    const hr = parseInt(hrRaw, 10);

    const step: IntervalStep = {
      stepNumber: stepNumber++,
      stepType,
      duration: duration || null,
      distance: !isNaN(distance) ? distance : null,
      pace: pace && pace !== '--' ? pace : null,
      hr: !isNaN(hr) ? hr : null,
    };

    steps.push(step);
  }

  if (steps.length === 0) return null;

  const hasCooldown = steps.some(s => s.stepType === 'cooldown');
  if (!hasCooldown && steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    if (lastStep.stepType === 'recovery') {
      lastStep.stepType = 'cooldown';
    }
  }

  const effortSteps = steps.filter(s => s.stepType === 'effort');
  const recoverySteps = steps.filter(s => s.stepType === 'recovery');
  
  const repetitionCount = effortSteps.length;
  
  let effortDuration: string | null = null;
  let effortDistance: number | null = null;
  let recoveryDuration: string | null = null;
  let recoveryDistance: number | null = null;

  if (repetitionCount > 0) {
    const durationCounts: Record<string, number> = {};
    const distanceCounts: Record<number, number> = {};
    
    effortSteps.forEach(s => {
      if (s.duration) durationCounts[s.duration] = (durationCounts[s.duration] || 0) + 1;
      if (s.distance) {
        const d = Math.round(s.distance * 100) / 100;
        distanceCounts[d] = (distanceCounts[d] || 0) + 1;
      }
    });
    
    const commonDuration = Object.entries(durationCounts).sort((a, b) => b[1] - a[1])[0];
    if (commonDuration) effortDuration = commonDuration[0];

    const commonDistance = Object.entries(distanceCounts).sort((a, b) => b[1] - a[1])[0];
    if (commonDistance) effortDistance = parseFloat(commonDistance[0]);
  }

  if (recoverySteps.length > 0) {
    const durationCounts: Record<string, number> = {};
    const distanceCounts: Record<number, number> = {};
    
    recoverySteps.forEach(s => {
      if (s.duration) durationCounts[s.duration] = (durationCounts[s.duration] || 0) + 1;
      if (s.distance) {
        const d = Math.round(s.distance * 100) / 100;
        distanceCounts[d] = (distanceCounts[d] || 0) + 1;
      }
    });
    
    const commonDuration = Object.entries(durationCounts).sort((a, b) => b[1] - a[1])[0];
    if (commonDuration) recoveryDuration = commonDuration[0];

     const commonDistance = Object.entries(distanceCounts).sort((a, b) => b[1] - a[1])[0];
    if (commonDistance) recoveryDistance = parseFloat(commonDistance[0]);
  }

  return {
    workoutType: null,
    repetitionCount: repetitionCount > 0 ? repetitionCount : null,
    effortDuration,
    recoveryDuration,
    effortDistance,
    recoveryDistance,
    targetEffortPace: null,
    targetEffortHR: null,
    targetRecoveryPace: null,
    steps
  };
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function mapStepType(typeRaw: string): StepType | null {
  const lower = typeRaw.toLowerCase();
  if (lower.includes('échauffement') || lower.includes('warmup')) return 'warmup';
  if (lower.includes('retour au calme') || lower.includes('cooldown')) return 'cooldown';
  if (lower.includes('récupération') || lower.includes('recovery') || lower.includes('repos') || lower.includes('rest')) return 'recovery';
  if (lower.includes('course') || lower.includes('run')) return 'effort';
  return null;
}

function formatDuration(duration: string): string {
  if (!duration || duration === '--') return '';
  
  const [minStr, secStr] = duration.split(':');
  if (!secStr) return duration;

  const min = parseInt(minStr, 10);
  const sec = parseFloat(secStr);
  
  const secRounded = Math.round(sec);
  
  return `${min.toString().padStart(2, '0')}:${secRounded.toString().padStart(2, '0')}`;
}
