import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setGlobalErrorReporter, reportError } from '../reporter';

describe('reporter', () => {
  beforeEach(() => {
    setGlobalErrorReporter(null as unknown as (error: unknown) => void);
  });

  it('does nothing when reporter is not set', () => {
    expect(() => reportError(new Error('test'))).not.toThrow();
  });

  it('calls reporter when set', () => {
    const reporter = vi.fn();
    setGlobalErrorReporter(reporter);

    const err = new Error('boom');
    reportError(err);

    expect(reporter).toHaveBeenCalledWith(err);
  });
});
