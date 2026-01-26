import { describe, it, expect } from 'vitest';
import { toPrismaJson } from '../prisma-json';

describe('toPrismaJson', () => {
  it('should convert simple object to Prisma JSON', () => {
    const data = { name: 'test', value: 42 };
    const result = toPrismaJson(data);

    expect(result).toEqual({ name: 'test', value: 42 });
  });

  it('should handle nested objects', () => {
    const data = {
      user: {
        name: 'John',
        settings: {
          theme: 'dark',
        },
      },
    };
    const result = toPrismaJson(data);

    expect(result).toEqual(data);
  });

  it('should handle arrays', () => {
    const data = {
      items: [1, 2, 3],
      users: [{ name: 'Alice' }, { name: 'Bob' }],
    };
    const result = toPrismaJson(data);

    expect(result).toEqual(data);
  });

  it('should convert Date objects to ISO strings', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const data = { createdAt: date };
    const result = toPrismaJson(data);

    expect(result).toEqual({ createdAt: '2024-01-15T10:30:00.000Z' });
  });

  it('should handle null values', () => {
    const data = { name: 'test', value: null };
    const result = toPrismaJson(data);

    expect(result).toEqual({ name: 'test', value: null });
  });

  it('should handle boolean values', () => {
    const data = { active: true, deleted: false };
    const result = toPrismaJson(data);

    expect(result).toEqual({ active: true, deleted: false });
  });

  it('should strip undefined values', () => {
    const data = { name: 'test', value: undefined };
    const result = toPrismaJson(data);

    expect(result).toEqual({ name: 'test' });
    expect('value' in (result as object)).toBe(false);
  });

  it('should handle empty object', () => {
    const data = {};
    const result = toPrismaJson(data);

    expect(result).toEqual({});
  });

  it('should handle complex nested structure', () => {
    const data = {
      steps: [
        { stepType: 'warmup', duration: '10:00', distance: 1.5 },
        { stepType: 'effort', duration: '05:00', distance: 1.0 },
      ],
      metadata: {
        source: 'ai',
        version: 2,
      },
    };
    const result = toPrismaJson(data);

    expect(result).toEqual(data);
  });
});
