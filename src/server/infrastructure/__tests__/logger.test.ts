import { describe, it, expect } from 'vitest';
import { createLogger, logger } from '../logger';

describe('logger infrastructure', () => {
  it('should export a logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('should create a child logger with context', () => {
    const childLogger = createLogger({ component: 'TestComponent' });
    expect(childLogger).toBeDefined();
    expect(typeof childLogger.debug).toBe('function');
    
    expect(childLogger).not.toBe(logger);
  });
});
