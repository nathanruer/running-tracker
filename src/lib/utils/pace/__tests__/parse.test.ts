import { describe, it, expect } from 'vitest';
import { validatePaceInput, normalizePaceFormat, normalizePaceOrRange } from '../parse';

describe('validatePaceInput', () => {
  it('should validate correct MM:SS pace format', () => {
    expect(validatePaceInput('05:30')).toBe(true);
    expect(validatePaceInput('5:30')).toBe(true);
    expect(validatePaceInput('04:15')).toBe(true);
    expect(validatePaceInput('10:00')).toBe(true);
  });

  it('should accept HH:MM:SS format for pace', () => {
    expect(validatePaceInput('00:05:30')).toBe(true);
    expect(validatePaceInput('01:05:30')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(validatePaceInput('invalid')).toBe(false);
    expect(validatePaceInput('12')).toBe(false);
    expect(validatePaceInput('12:60')).toBe(false);
    expect(validatePaceInput('')).toBe(false);
  });

  it('should reject negative values', () => {
    expect(validatePaceInput('-5:30')).toBe(false);
    expect(validatePaceInput('5:-30')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validatePaceInput(null as unknown as string)).toBe(false);
    expect(validatePaceInput(undefined as unknown as string)).toBe(false);
  });
});

describe('normalizePaceFormat', () => {
  it('should normalize pace to MM:SS with padding', () => {
    expect(normalizePaceFormat('5:30')).toBe('05:30');
    expect(normalizePaceFormat('05:30')).toBe('05:30');
    expect(normalizePaceFormat('4:5')).toBe('04:05');
  });

  it('should return null for invalid pace', () => {
    expect(normalizePaceFormat('invalid')).toBe(null);
    expect(normalizePaceFormat('12:60')).toBe(null);
    expect(normalizePaceFormat('12:60')).toBe(null);
    expect(normalizePaceFormat('')).toBe(null);
  });

  it('should normalize HH:MM:SS pace', () => {
    expect(normalizePaceFormat('00:05:30')).toBe('00:05:30');
    expect(normalizePaceFormat('1:5:30')).toBe('01:05:30');
  });
});

describe('normalizePaceOrRange', () => {
  it('should normalize single pace values', () => {
    expect(normalizePaceOrRange('5:30')).toBe('05:30');
    expect(normalizePaceOrRange('05:30')).toBe('05:30');
    expect(normalizePaceOrRange('7:15')).toBe('07:15');
  });

  it('should return valid pace ranges as-is', () => {
    expect(normalizePaceOrRange('5:30-5:40')).toBe('5:30-5:40');
    expect(normalizePaceOrRange('7:10-7:25')).toBe('7:10-7:25');
    expect(normalizePaceOrRange('8:00-8:20')).toBe('8:00-8:20');
  });

  it('should handle ranges with spaces', () => {
    expect(normalizePaceOrRange('5:30 - 5:40')).toBe('5:30 - 5:40');
  });

  it('should return null for invalid inputs', () => {
    expect(normalizePaceOrRange(null)).toBe(null);
    expect(normalizePaceOrRange(undefined)).toBe(null);
    expect(normalizePaceOrRange('')).toBe(null);
    expect(normalizePaceOrRange('invalid')).toBe(null);
  });

  it('should handle edge cases with invalid range parts', () => {
    expect(normalizePaceOrRange('abc-def')).toBe(null);
    expect(normalizePaceOrRange('-5:30')).toBe(null);
  });
});
