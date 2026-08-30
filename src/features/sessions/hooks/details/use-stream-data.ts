import { useMemo } from 'react';
import { validateStreams } from '@/lib/validation/streams';
import {
  prepareAltitudeData,
  preparePaceData,
  prepareHeartrateData,
  prepareCadenceData,
  getAvailableStreams,
  calculatePaceDomain,
} from '@/lib/utils/geo/stream-charts';

export function useStreamData(streams: unknown) {
  const validatedStreams = useMemo(() => {
    if (!streams) return null;
    return validateStreams(streams);
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
    return calculatePaceDomain(paceData);
  }, [chartData.pace]);

  return {
    validatedStreams,
    availableStreams,
    chartData,
    paceDomain,
  };
}
