import { useMemo } from 'react';
import type { StravaStreamSet } from '@/lib/types';
import { validateStravaStreams } from '@/lib/validation/strava';
import {
  prepareAltitudeData,
  preparePaceData,
  prepareHeartrateData,
  prepareCadenceData,
  getAvailableStreams,
  calculateStreamAverage,
} from '@/lib/utils/geo/stream-charts';
import { STREAM_CHART_CONSTANTS } from '@/lib/constants/stream-charts';

export function useStreamData(streams: unknown) {
  const validatedStreams = useMemo(() => {
    if (!streams) return null;
    return validateStravaStreams(streams) as StravaStreamSet | null;
  }, [streams]);

  const availableStreams = useMemo(() => {
    if (!validatedStreams) return [];
    return getAvailableStreams(validatedStreams);
  }, [validatedStreams]);

  const chartData = useMemo(() => {
    if (!validatedStreams) return {};

    return {
      altitude: prepareAltitudeData(validatedStreams),
      pace: preparePaceData(validatedStreams),
      heartrate: prepareHeartrateData(validatedStreams),
      cadence: prepareCadenceData(validatedStreams),
    };
  }, [validatedStreams]);

  const paceDomain = useMemo(() => {
    const paceData = chartData.pace || [];
    if (paceData.length === 0) return undefined;

    const validPaces = paceData.map(d => d.value).filter(v => v < 1800);
    
    if (validPaces.length === 0) return [0, 1800];

    const minPace = Math.min(...validPaces);
    const maxValidPace = Math.max(...validPaces);
    
    const domainMin = Math.max(0, minPace * 0.9);
    
    const average = calculateStreamAverage(paceData.filter(d => d.value < 1800));
    const calculatedMax = average * STREAM_CHART_CONSTANTS.PACE_DOMAIN_MULTIPLIER;
    
    const domainMax = Math.min(1800, Math.max(maxValidPace, calculatedMax));

    return [domainMin, domainMax] as [number, number];
  }, [chartData.pace]);

  return {
    validatedStreams,
    availableStreams,
    chartData,
    paceDomain,
  };
}
