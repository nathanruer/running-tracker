export interface TCXLap {
  startTime: string;
  totalTimeSeconds: number;
  distanceMeters: number;
  averageHeartRate: number | null;
  maximumHeartRate: number | null;
  intensity: string;
}

export interface TCXActivity {
  id: string;
  sport: string;
  laps: TCXLap[];
  totalTimeSeconds: number;
  totalDistanceMeters: number;
  averageHeartRate: number | null;
}

export function parseTCXFile(xmlContent: string): TCXActivity | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('XML parsing error:', parserError.textContent);
      return null;
    }

    const activity = xmlDoc.querySelector('Activity');
    if (!activity) {
      console.error('No Activity found in TCX file');
      return null;
    }

    const sport = activity.getAttribute('Sport') || 'Running';
    const id = activity.querySelector('Id')?.textContent || '';

    const lapElements = xmlDoc.querySelectorAll('Lap');
    const laps: TCXLap[] = [];

    lapElements.forEach((lapElement) => {
      const startTime = lapElement.getAttribute('StartTime') || '';
      const totalTimeSeconds = parseFloat(
        lapElement.querySelector('TotalTimeSeconds')?.textContent || '0'
      );
      const distanceMeters = parseFloat(
        lapElement.querySelector('DistanceMeters')?.textContent || '0'
      );
      const avgHRElement = lapElement.querySelector('AverageHeartRateBpm > Value');
      const maxHRElement = lapElement.querySelector('MaximumHeartRateBpm > Value');
      const intensity = lapElement.querySelector('Intensity')?.textContent || 'Active';

      laps.push({
        startTime,
        totalTimeSeconds,
        distanceMeters,
        averageHeartRate: avgHRElement ? parseInt(avgHRElement.textContent || '0') : null,
        maximumHeartRate: maxHRElement ? parseInt(maxHRElement.textContent || '0') : null,
        intensity,
      });
    });

    const totalTimeSeconds = laps.reduce((sum, lap) => sum + lap.totalTimeSeconds, 0);
    const totalDistanceMeters = laps.reduce((sum, lap) => sum + lap.distanceMeters, 0);

    const lapsWithHR = laps.filter((lap) => lap.averageHeartRate !== null);
    const averageHeartRate =
      lapsWithHR.length > 0
        ? Math.round(
            lapsWithHR.reduce((sum, lap) => sum + (lap.averageHeartRate || 0), 0) /
              lapsWithHR.length
          )
        : null;

    return {
      id,
      sport,
      laps,
      totalTimeSeconds,
      totalDistanceMeters,
      averageHeartRate,
    };
  } catch (error) {
    console.error('Error parsing TCX file:', error);
    return null;
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm === 0) return '00:00';
  const paceSeconds = durationSeconds / distanceKm;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function tcxActivityToFormData(activity: TCXActivity) {
  const distanceKm = activity.totalDistanceMeters / 1000;
  const avgPace = formatPace(distanceKm, activity.totalTimeSeconds);

  const date = activity.id ? activity.id.split('T')[0] : new Date().toISOString().split('T')[0];

  return {
    date,
    duration: new Date(activity.totalTimeSeconds * 1000).toISOString().substr(11, 8),
    distance: Math.round(distanceKm * 100) / 100,
    avgPace,
    avgHeartRate: activity.averageHeartRate || 0,
  };
}

interface IntervalStep {
  stepNumber: number;
  stepType: 'warmup' | 'effort' | 'recovery' | 'cooldown';
  duration: string;
  distance: number;
  pace: string;
  hr: number | null;
}

export function detectIntervalStructure(laps: TCXLap[]): {
  isInterval: boolean;
  workoutType: string | null;
  repetitionCount: number | null;
  effortDuration: string | null;
  recoveryDuration: string | null;
  effortDistance: number | null;
  actualEffortPace: string | null;
  actualRecoveryPace: string | null;
  actualEffortHR: number | null;
  steps: IntervalStep[];
} {
  if (laps.length < 2) {
    return {
      isInterval: false,
      workoutType: null,
      repetitionCount: null,
      effortDuration: null,
      recoveryDuration: null,
      effortDistance: null,
      actualEffortPace: null,
      actualRecoveryPace: null,
      actualEffortHR: null,
      steps: [],
    };
  }

  const getLapPace = (lap: TCXLap) => {
    if (lap.distanceMeters < 10) return 0;
    return lap.totalTimeSeconds / (lap.distanceMeters / 1000);
  };

  const mergedBlocks: TCXLap[] = [];
  let currentBlockLaps: TCXLap[] = [laps[0]];

  for (let i = 1; i < laps.length; i++) {
    const prevLap = laps[i - 1];
    const currLap = laps[i];
    const prevPace = getLapPace(prevLap);
    const currPace = getLapPace(currLap);

    const isAutolap = Math.abs(prevLap.distanceMeters - 1000) < 50 || Math.abs(prevLap.distanceMeters - 1609) < 50;
    const isShortRemainder = currLap.totalTimeSeconds < 120 || currLap.distanceMeters < 300;
    
    const paceDiff = prevPace && currPace 
      ? Math.abs(prevPace - currPace) / Math.max(prevPace, currPace) 
      : 0;
    const isSimilarPace = paceDiff < 0.15;

    const combinedDuration = currentBlockLaps.reduce((sum, l) => sum + l.totalTimeSeconds, 0) + currLap.totalTimeSeconds;
    const isRoundDuration = Math.abs(combinedDuration % 30) < 2 || Math.abs(combinedDuration % 60) < 2;

    let shouldMerge = false;

    if (isAutolap && (isShortRemainder || isSimilarPace)) {
      shouldMerge = true;
    } else if (isSimilarPace && !isShortRemainder) {
        shouldMerge = true;
    } else if (isShortRemainder && isRoundDuration && isAutolap) {
        shouldMerge = true;
    }

    if (paceDiff > 0.25 && currLap.distanceMeters > 50) {
        shouldMerge = false;
    }

    if (shouldMerge) {
      currentBlockLaps.push(currLap);
    } else {
      mergedBlocks.push(mergeLaps(currentBlockLaps));
      currentBlockLaps = [currLap];
    }
  }
  mergedBlocks.push(mergeLaps(currentBlockLaps));

  if (mergedBlocks.length < 2) {
      return {
          isInterval: false,
          workoutType: null,
          repetitionCount: null,
          effortDuration: null,
          recoveryDuration: null,
          effortDistance: null,
          actualEffortPace: null,
          actualRecoveryPace: null,
          actualEffortHR: null,
          steps: mergedBlocks.map((block, idx) => toIntervalStep(block, idx + 1, 'effort'))
      };
  }

  const steps: IntervalStep[] = [];
  let stepNumber = 1;

  steps.push(toIntervalStep(mergedBlocks[0], stepNumber++, 'warmup'));

  const hasCooldown = mergedBlocks.length > 2; 
  const middleBlocks = hasCooldown ? mergedBlocks.slice(1, -1) : mergedBlocks.slice(1);
  
  const avgPaceMiddle = middleBlocks.reduce((sum, b) => sum + getLapPace(b), 0) / middleBlocks.length;

  let effortCount = 0;
  const effortDurations: number[] = [];
  const recoveryDurations: number[] = [];
  const effortDistances: number[] = [];

  middleBlocks.forEach((block) => {
      const blockPace = getLapPace(block);
      const isEffort = blockPace < avgPaceMiddle;

      if (isEffort) {
          steps.push(toIntervalStep(block, stepNumber++, 'effort'));
          effortCount++;
          effortDurations.push(block.totalTimeSeconds);
          effortDistances.push(block.distanceMeters / 1000);
      } else {
          steps.push(toIntervalStep(block, stepNumber++, 'recovery'));
          recoveryDurations.push(block.totalTimeSeconds);
      }
  });

  if (hasCooldown) {
      steps.push(toIntervalStep(mergedBlocks[mergedBlocks.length - 1], stepNumber++, 'cooldown'));
  }

  const avgEffortDuration = effortDurations.length > 0 ? effortDurations.reduce((a, b) => a + b, 0) / effortDurations.length : null;
  const avgRecoveryDuration = recoveryDurations.length > 0 ? recoveryDurations.reduce((a, b) => a + b, 0) / recoveryDurations.length : null;
  const avgEffortDistance = effortDistances.length > 0 ? effortDistances.reduce((a, b) => a + b, 0) / effortDistances.length : null;

  let totalEffortTime = 0;
  let totalEffortDistance = 0;
  let weightedEffortHR = 0;
  let totalEffortHRTime = 0;

  let totalRecoveryTime = 0;
  let totalRecoveryDistance = 0;

  middleBlocks.forEach((block) => {
    const pace = getLapPace(block);
    if (pace < avgPaceMiddle) {
      totalEffortTime += block.totalTimeSeconds;
      totalEffortDistance += block.distanceMeters / 1000;
      if (block.averageHeartRate) {
        weightedEffortHR += block.averageHeartRate * block.totalTimeSeconds;
        totalEffortHRTime += block.totalTimeSeconds;
      }
    } else {
      totalRecoveryTime += block.totalTimeSeconds;
      totalRecoveryDistance += block.distanceMeters / 1000;
    }
  });

  const actualEffortPace = totalEffortDistance > 0 ? formatPace(totalEffortDistance, totalEffortTime) : null;
  const actualRecoveryPace = totalRecoveryDistance > 0 ? formatPace(totalRecoveryDistance, totalRecoveryTime) : null;
  const actualEffortHR = totalEffortHRTime > 0 ? Math.round(weightedEffortHR / totalEffortHRTime) : null;

  return {
    isInterval: effortCount >= 1,
    workoutType: null,
    repetitionCount: effortCount,
    effortDuration: avgEffortDuration ? formatDuration(avgEffortDuration) : null,
    recoveryDuration: avgRecoveryDuration ? formatDuration(avgRecoveryDuration) : null,
    effortDistance: avgEffortDistance ? Math.round(avgEffortDistance * 100) / 100 : null,
    actualEffortPace,
    actualEffortHR,
    actualRecoveryPace,
    steps,
  };
}

function mergeLaps(laps: TCXLap[]): TCXLap {
    if (laps.length === 1) return laps[0];
    
    const totalTime = laps.reduce((sum, l) => sum + l.totalTimeSeconds, 0);
    const totalDist = laps.reduce((sum, l) => sum + l.distanceMeters, 0);
    
    let weightedHRSum = 0;
    let totalHRTime = 0;
    let maxHR = 0;

    laps.forEach(l => {
        if (l.averageHeartRate) {
            weightedHRSum += l.averageHeartRate * l.totalTimeSeconds;
            totalHRTime += l.totalTimeSeconds;
        }
        if (l.maximumHeartRate && l.maximumHeartRate > maxHR) {
            maxHR = l.maximumHeartRate;
        }
    });

    return {
        startTime: laps[0].startTime,
        totalTimeSeconds: totalTime,
        distanceMeters: totalDist,
        averageHeartRate: totalHRTime > 0 ? Math.round(weightedHRSum / totalHRTime) : null,
        maximumHeartRate: maxHR || null,
        intensity: laps[0].intensity
    };
}

function toIntervalStep(lap: TCXLap, number: number, type: 'warmup' | 'effort' | 'recovery' | 'cooldown'): IntervalStep {
    return {
        stepNumber: number,
        stepType: type,
        duration: formatDuration(lap.totalTimeSeconds),
        distance: Math.round((lap.distanceMeters / 1000) * 100) / 100,
        pace: formatPace(lap.distanceMeters / 1000, lap.totalTimeSeconds),
        hr: lap.averageHeartRate
    };
}
