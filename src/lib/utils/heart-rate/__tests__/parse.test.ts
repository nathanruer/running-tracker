import { describe, it, expect } from 'vitest';
import { parseHRValue, extractStepHR, hasHRData, extractHeartRateValue } from '../parse';

describe('parseHRValue', () => {
  it('should return null for null input', () => {
    expect(parseHRValue(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(parseHRValue(undefined)).toBeNull();
  });

  it('should parse positive number directly', () => {
    expect(parseHRValue(160)).toBe(160);
  });

  it('should return null for zero or negative numbers', () => {
    expect(parseHRValue(0)).toBeNull();
    expect(parseHRValue(-10)).toBeNull();
  });

  it('should parse single value string', () => {
    expect(parseHRValue('160')).toBe(160);
  });

  it('should parse range and return average', () => {
    expect(parseHRValue('160-170')).toBe(165);
    expect(parseHRValue('140-160')).toBe(150);
  });

  it('should return null for invalid string', () => {
    expect(parseHRValue('invalid')).toBeNull();
    expect(parseHRValue('')).toBeNull();
  });
});

describe('extractStepHR', () => {
  it('should extract hr field if present and positive', () => {
    expect(extractStepHR({ hr: 160 })).toBe(160);
  });

  it('should return null for zero hr', () => {
    expect(extractStepHR({ hr: 0 })).toBeNull();
  });

  it('should return null for null hr', () => {
    expect(extractStepHR({ hr: null })).toBeNull();
  });

  it('should fallback to hrRange if hr is not present', () => {
    expect(extractStepHR({ hr: null, hrRange: '160-170' })).toBe(165);
  });

  it('should prefer hr over hrRange', () => {
    expect(extractStepHR({ hr: 160, hrRange: '170-180' })).toBe(160);
  });

  it('should return null if both are null', () => {
    expect(extractStepHR({ hr: null, hrRange: null })).toBeNull();
  });
});

describe('hasHRData', () => {
  it('should return true when hr is present and positive', () => {
    expect(hasHRData({ hr: 160 })).toBe(true);
  });

  it('should return true when hrRange is present', () => {
    expect(hasHRData({ hrRange: '160-170' })).toBe(true);
  });

  it('should return false when hr is 0', () => {
    expect(hasHRData({ hr: 0 })).toBe(false);
  });

  it('should return false when both are null', () => {
    expect(hasHRData({ hr: null, hrRange: null })).toBe(false);
  });

  it('should return false for null data', () => {
    expect(hasHRData(null)).toBe(false);
  });

  it('should return false for undefined data', () => {
    expect(hasHRData(undefined)).toBe(false);
  });

  it('should return false for empty hrRange', () => {
    expect(hasHRData({ hrRange: '' })).toBe(false);
  });
});

describe('extractHeartRateValue', () => {
  it('should return number when input is number', () => {
    expect(extractHeartRateValue(150)).toBe(150);
  });

  it('should parse string to number', () => {
    expect(extractHeartRateValue('150')).toBe(150);
    expect(extractHeartRateValue('150.5')).toBe(150.5);
  });

  it('should return null for invalid strings', () => {
    expect(extractHeartRateValue('invalid')).toBeNull();
    expect(extractHeartRateValue('')).toBeNull();
  });

  it('should return null for null or undefined', () => {
    expect(extractHeartRateValue(null)).toBeNull();
    expect(extractHeartRateValue(undefined)).toBeNull();
  });
});
