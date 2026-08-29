import { describe, it, expect } from 'vitest';
import {
  updateProfileSchema,
  completeSessionSchema,
  bulkImportSchema,
  bulkPlannedSchema,
  bulkDeleteSchema,
} from '@/lib/validation';

describe('updateProfileSchema', () => {
  it('coerces numeric strings and treats empty strings as absent', () => {
    const parsed = updateProfileSchema.parse({ weight: '72.5', age: '', vma: '17.2', goal: 'sub 40 au 10k' });
    expect(parsed.weight).toBe(72.5);
    expect(parsed.age).toBeUndefined();
    expect(parsed.vma).toBe(17.2);
  });

  it('rejects non-numeric and out-of-range values', () => {
    expect(updateProfileSchema.safeParse({ weight: 'abc' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ maxHeartRate: 400 }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ age: 7 }).success).toBe(false);
  });
});

describe('completeSessionSchema', () => {
  it('requires a parseable date', () => {
    expect(completeSessionSchema.safeParse({ date: 'not-a-date' }).success).toBe(false);
    expect(completeSessionSchema.safeParse({}).success).toBe(false);
    expect(completeSessionSchema.safeParse({ date: '2026-08-29T10:00:00' }).success).toBe(true);
  });

  it('strips unknown fields instead of passing them through', () => {
    const parsed = completeSessionSchema.parse({
      date: '2026-08-29',
      comments: 'ok',
      sessionNumber: 999,
      injectedField: 'nope',
    });
    expect('injectedField' in parsed).toBe(false);
    expect('sessionNumber' in parsed).toBe(false);
  });
});

describe('bulk schemas', () => {
  it('rejects empty arrays and enforces caps', () => {
    expect(bulkDeleteSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(bulkDeleteSchema.safeParse({ ids: Array(501).fill('id') }).success).toBe(false);
    expect(bulkDeleteSchema.safeParse({ ids: ['a', 'b'] }).success).toBe(true);
    expect(bulkDeleteSchema.safeParse({ ids: ['a', 42] }).success).toBe(false);

    expect(bulkPlannedSchema.safeParse({ sessions: [] }).success).toBe(false);
    expect(bulkPlannedSchema.safeParse({ sessions: Array(101).fill({}) }).success).toBe(false);

    expect(bulkImportSchema.safeParse({ sessions: [] }).success).toBe(false);
  });
});
