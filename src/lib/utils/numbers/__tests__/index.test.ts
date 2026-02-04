import { describe, it, expect } from 'vitest';
import { formatNumber, parseNullableNumberInput } from '../index';

describe('formatNumber', () => {
  it('should format numbers with French thousand separators', () => {
    expect(formatNumber(1234)).toBe('1\u202f234');
    expect(formatNumber(1234567)).toBe('1\u202f234\u202f567');
  });

  it('should format numbers with specified decimals', () => {
    expect(formatNumber(1234.56, 2)).toBe('1\u202f234,56');
    expect(formatNumber(1234.567, 1)).toBe('1\u202f234,6');
    expect(formatNumber(1234, 2)).toBe('1\u202f234,00');
  });

  it('should default to 0 decimals', () => {
    expect(formatNumber(1234.56)).toBe('1\u202f235');
    expect(formatNumber(1234.4)).toBe('1\u202f234');
  });
});

describe('parseNullableNumberInput', () => {
  it('should return null for empty input', () => {
    expect(parseNullableNumberInput('')).toBeNull();
    expect(parseNullableNumberInput('   ')).toBeNull();
  });

  it('should allow a negative sign when enabled', () => {
    expect(parseNullableNumberInput('-', { allowNegativeSign: true })).toBe('-');
    expect(parseNullableNumberInput('-', { allowNegativeSign: false })).toBeUndefined();
  });

  it('should parse floats and apply rounding', () => {
    expect(parseNullableNumberInput('12.345', { decimals: 2 })).toBe(12.35);
    expect(parseNullableNumberInput('12.3', { decimals: 2 })).toBe(12.3);
  });

  it('should parse integers when mode is int', () => {
    expect(parseNullableNumberInput('42', { mode: 'int' })).toBe(42);
  });

  it('should return undefined for invalid input', () => {
    expect(parseNullableNumberInput('abc')).toBeUndefined();
  });
});
