import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn utility function', () => {
  it('merges single class', () => {
    const result = cn('text-red-500');
    expect(result).toBe('text-red-500');
  });

  it('merges multiple classes', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('handles undefined values', () => {
    const result = cn('text-red-500', undefined, 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('handles null values', () => {
    const result = cn('text-red-500', null, 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    );
    expect(result).toBe('base-class active-class');
  });

  it('merges tailwind conflicting classes (last one wins)', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('merges padding classes correctly', () => {
    const result = cn('p-4', 'px-2');
    expect(result).toBe('p-4 px-2');
  });

  it('handles array of classes', () => {
    const result = cn(['text-red-500', 'bg-blue-500']);
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('handles object syntax', () => {
    const result = cn({
      'text-red-500': true,
      'text-blue-500': false,
    });
    expect(result).toBe('text-red-500');
  });

  it('returns empty string for no classes', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('returns empty string for only falsy values', () => {
    const result = cn(null, undefined, false);
    expect(result).toBe('');
  });
});
