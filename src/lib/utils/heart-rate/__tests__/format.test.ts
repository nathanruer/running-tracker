import { describe, it, expect } from 'vitest';
import { formatHRDisplay, formatHeartRate } from '../format';

describe('formatHRDisplay', () => {
  it('should format calculated value with approximation and unit', () => {
    expect(formatHRDisplay(160, null)).toBe('~160 bpm');
  });

  it('should format calculated value without approximation', () => {
    expect(formatHRDisplay(160, null, { useApproximation: false })).toBe('160 bpm');
  });

  it('should format without unit', () => {
    expect(formatHRDisplay(160, null, { includeUnit: false })).toBe('~160');
  });

  it('should use fallback when calculated is null', () => {
    expect(formatHRDisplay(null, 155)).toBe('~155 bpm');
  });

  it('should use fallback when calculated is 0', () => {
    expect(formatHRDisplay(0, 155)).toBe('~155 bpm');
  });

  it('should parse string fallback', () => {
    expect(formatHRDisplay(null, '160-170')).toBe('~165 bpm');
  });

  it('should return empty value when no data', () => {
    expect(formatHRDisplay(null, null)).toBe('-');
  });

  it('should use custom empty value', () => {
    expect(formatHRDisplay(null, null, { emptyValue: 'N/A' })).toBe('N/A');
  });

  it('should round calculated values', () => {
    expect(formatHRDisplay(160.7, null)).toBe('~161 bpm');
  });
});

describe('formatHeartRate', () => {
  it('should format heart rate with bpm unit', () => {
    expect(formatHeartRate(145)).toBe('145 bpm');
    expect(formatHeartRate(72)).toBe('72 bpm');
    expect(formatHeartRate(180)).toBe('180 bpm');
  });

  it('should round to nearest integer', () => {
    expect(formatHeartRate(145.6)).toBe('146 bpm');
    expect(formatHeartRate(145.4)).toBe('145 bpm');
  });

  it('should return -- for 0 or negative values', () => {
    expect(formatHeartRate(0)).toBe('--');
    expect(formatHeartRate(-5)).toBe('--');
  });
});
