import { describe, it, expect } from 'vitest';
import { decodePolyline, coordinatesToSVG } from '../polyline';

describe('decodePolyline', () => {
  it('should decode a simple polyline', () => {
    // This is a well-known test case from Google's documentation
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const result = decodePolyline(encoded);
    
    expect(result.length).toBe(3);
    expect(result[0][0]).toBeCloseTo(38.5, 1);
    expect(result[0][1]).toBeCloseTo(-120.2, 1);
  });

  it('should return empty array for empty string', () => {
    const result = decodePolyline('');
    expect(result).toEqual([]);
  });

  it('should handle single point', () => {
    // A single point in polyline encoding
    const result = decodePolyline('_p~iF~ps|U');
    expect(result.length).toBe(1);
  });
});

describe('coordinatesToSVG', () => {
  it('should return empty path for empty coordinates', () => {
    const result = coordinatesToSVG([], 300, 180);
    expect(result.path).toBe('');
    expect(result.viewBox).toBe('0 0 0 0');
  });

  it('should generate valid SVG path for coordinates', () => {
    const coordinates: [number, number][] = [
      [48.8566, 2.3522],
      [48.8600, 2.3600],
      [48.8550, 2.3650],
    ];
    
    const result = coordinatesToSVG(coordinates, 300, 180);
    
    expect(result.path).toMatch(/^M /);
    expect(result.path).toContain(' L ');
    expect(result.viewBox).toBe('0 0 300 180');
  });

  it('should center the path within the viewport', () => {
    const coordinates: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    
    const result = coordinatesToSVG(coordinates, 100, 100, 10);
    
    // Path should be within bounds
    const pathPoints = result.path.replace('M ', '').split(' L ');
    pathPoints.forEach(point => {
      const [x, y] = point.split(',').map(parseFloat);
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThanOrEqual(90);
      expect(y).toBeGreaterThanOrEqual(10);
      expect(y).toBeLessThanOrEqual(90);
    });
  });

  it('should handle single coordinate', () => {
    const coordinates: [number, number][] = [[48.8566, 2.3522]];
    
    // Single point should still work (though path will just be a point)
    const result = coordinatesToSVG(coordinates, 300, 180);
    expect(result.viewBox).toBe('0 0 300 180');
  });
});
