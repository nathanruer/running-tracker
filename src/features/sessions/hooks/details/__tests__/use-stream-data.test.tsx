import { renderHook } from '@testing-library/react';
import { useStreamData } from '../use-stream-data';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/lib/validation/strava', () => ({
  validateStravaStreams: vi.fn((streams) => streams),
}));

vi.mock('@/lib/utils/geo/stream-charts', () => ({
  prepareAltitudeData: vi.fn(() => [{ value: 100 }]),
  preparePaceData: vi.fn(() => [{ value: 300 }]),
  prepareHeartrateData: vi.fn(() => []),
  prepareCadenceData: vi.fn(() => []),
  getAvailableStreams: vi.fn(() => ['altitude', 'pace']),
  calculateStreamAverage: vi.fn(() => 300),
  calculatePaceDomain: vi.fn((data) => {
    if (data.length === 0) return undefined;
    const value = data[0].value;
    return [value * 0.9, value * 2.2];
  }),
}));

describe('useStreamData', () => {
  it('should process streams correctly', () => {
    const mockStreams = { valid: true };
    const { result } = renderHook(() => useStreamData(mockStreams));

    expect(result.current.validatedStreams).toBe(mockStreams);
    expect(result.current.availableStreams).toEqual(['altitude', 'pace']);
    expect(result.current.chartData.altitude).toHaveLength(1);
    expect(result.current.paceDomain).toEqual([270, 660]); // min: 300 * 0.9 = 270, max: 300 * 2.2 = 660
  });

  it('should handle null streams', () => {
    const { result } = renderHook(() => useStreamData(null));
    expect(result.current.validatedStreams).toBeNull();
    expect(result.current.availableStreams).toEqual([]);
  });
});
