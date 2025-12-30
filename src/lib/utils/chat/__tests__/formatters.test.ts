import { describe, it, expect } from 'vitest';
import { formatDurationChat } from '../formatters';

describe('formatDurationChat', () => {
  it('should format minutes only when less than 1 hour', () => {
    expect(formatDurationChat(0)).toBe('0 min');
    expect(formatDurationChat(15)).toBe('15 min');
    expect(formatDurationChat(45)).toBe('45 min');
    expect(formatDurationChat(59)).toBe('59 min');
  });

  it('should format hours and minutes when 1 hour or more', () => {
    expect(formatDurationChat(60)).toBe('1h00');
    expect(formatDurationChat(90)).toBe('1h30');
    expect(formatDurationChat(120)).toBe('2h00');
    expect(formatDurationChat(135)).toBe('2h15');
  });

  it('should pad minutes with zero when needed', () => {
    expect(formatDurationChat(65)).toBe('1h05');
    expect(formatDurationChat(125)).toBe('2h05');
    expect(formatDurationChat(185)).toBe('3h05');
  });

  it('should handle large durations', () => {
    expect(formatDurationChat(180)).toBe('3h00');
    expect(formatDurationChat(240)).toBe('4h00');
    expect(formatDurationChat(305)).toBe('5h05');
  });
});
