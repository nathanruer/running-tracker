import { sanitizeForPrompt, sanitizeForLog } from '../sanitize';

describe('sanitizeForPrompt', () => {
  it('should return empty string for null or undefined', () => {
    expect(sanitizeForPrompt(null)).toBe('');
    expect(sanitizeForPrompt(undefined)).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeForPrompt(123 as unknown as string)).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeForPrompt('  hello world  ')).toBe('hello world');
  });

  it('should remove control characters', () => {
    expect(sanitizeForPrompt('hello\x00world')).toBe('helloworld');
    expect(sanitizeForPrompt('test\x1Fvalue')).toBe('testvalue');
    expect(sanitizeForPrompt('line\x0Bbreak')).toBe('linebreak');
  });

  it('should preserve normal newlines and tabs', () => {
    expect(sanitizeForPrompt('hello\nworld')).toBe('hello\nworld');
    expect(sanitizeForPrompt('hello\tworld')).toBe('hello\tworld');
  });

  it('should truncate to default max length', () => {
    const longString = 'a'.repeat(600);
    expect(sanitizeForPrompt(longString)).toHaveLength(500);
  });

  it('should truncate to custom max length', () => {
    const longString = 'a'.repeat(200);
    expect(sanitizeForPrompt(longString, 50)).toHaveLength(50);
  });

  it('should handle combined operations', () => {
    const input = '  \x00hello\x1F world  ';
    expect(sanitizeForPrompt(input)).toBe('hello world');
  });
});

describe('sanitizeForLog', () => {
  it('should return empty string for null or undefined', () => {
    expect(sanitizeForLog(null)).toBe('');
    expect(sanitizeForLog(undefined)).toBe('');
  });

  it('should truncate to default log max length (200)', () => {
    const longString = 'a'.repeat(300);
    expect(sanitizeForLog(longString)).toHaveLength(200);
  });

  it('should remove control characters', () => {
    expect(sanitizeForLog('test\x00value')).toBe('testvalue');
  });

  it('should trim whitespace', () => {
    expect(sanitizeForLog('  text  ')).toBe('text');
  });
});
