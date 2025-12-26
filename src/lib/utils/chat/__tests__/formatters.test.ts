import { describe, it, expect } from 'vitest';
import { formatDuration } from '../formatters';

describe('formatDuration', () => {
  it('should format minutes only when less than 1 hour', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(15)).toBe('15 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(59)).toBe('59 min');
  });

  it('should format hours and minutes when 1 hour or more', () => {
    expect(formatDuration(60)).toBe('1h00');
    expect(formatDuration(90)).toBe('1h30');
    expect(formatDuration(120)).toBe('2h00');
    expect(formatDuration(135)).toBe('2h15');
  });

  it('should pad minutes with zero when needed', () => {
    expect(formatDuration(65)).toBe('1h05');
    expect(formatDuration(125)).toBe('2h05');
    expect(formatDuration(185)).toBe('3h05');
  });

  it('should handle large durations', () => {
    expect(formatDuration(180)).toBe('3h00');
    expect(formatDuration(240)).toBe('4h00');
    expect(formatDuration(305)).toBe('5h05');
  });
});
