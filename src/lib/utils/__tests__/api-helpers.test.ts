import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { validateAuth, handleZodError, handleNotFound, handleServerError, withErrorHandling } from '../api-helpers';

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      findFirst: vi.fn(),
    },
  },
}));

import { getUserIdFromRequest } from '@/lib/auth';

describe('api-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAuth', () => {
    it('should return userId when authenticated', async () => {
      const mockRequest = {} as NextRequest;
      vi.mocked(getUserIdFromRequest).mockReturnValue('user123');

      const result = await validateAuth(mockRequest);

      expect(result).toBe('user123');
    });

    it('should return 401 response when not authenticated', async () => {
      const mockRequest = {} as NextRequest;
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const result = await validateAuth(mockRequest);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        const json = await result.json();
        expect(json).toEqual({ error: 'Non authentifié' });
        expect(result.status).toBe(401);
      }
    });
  });

  describe('handleZodError', () => {
    it('should return 400 with error details', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['field'],
          message: 'Expected string, received number',
        },
      ]);

      const result = handleZodError(zodError);

      expect(result).toBeInstanceOf(NextResponse);
      expect(result.status).toBe(400);
    });

    it('should include all issues in details', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['field1'],
          message: 'Error 1',
        },
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: ['field2'],
          message: 'Error 2',
        },
      ]);

      const result = handleZodError(zodError);
      const json = await result.json();

      expect(json.details).toHaveLength(2);
    });
  });

  describe('handleNotFound', () => {
    it('should return 404 with default message', async () => {
      const result = handleNotFound();

      expect(result.status).toBe(404);
      const json = await result.json();
      expect(json).toEqual({ error: 'Ressource introuvable' });
    });

    it('should return 404 with custom message', async () => {
      const result = handleNotFound('Custom not found');

      expect(result.status).toBe(404);
      const json = await result.json();
      expect(json).toEqual({ error: 'Custom not found' });
    });
  });

  describe('handleServerError', () => {
    it('should return 500 response', async () => {
      const error = new Error('Test error');
      const context = { userId: 'user123' };

      const result = handleServerError(error, context);

      expect(result.status).toBe(500);
      const json = await result.json();
      expect(json).toEqual({ error: 'Erreur interne du serveur' });
    });
  });

  describe('withErrorHandling', () => {
    it('should return result when no error', async () => {
      const fn = vi.fn().mockResolvedValue({ success: true });
      const context = { userId: 'user123' };

      const result = await withErrorHandling(fn, context);

      expect(result).toEqual({ success: true });
      expect(fn).toHaveBeenCalled();
    });

    it('should handle ZodError', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['field'],
          message: 'Invalid',
        },
      ]);
      const fn = vi.fn().mockRejectedValue(zodError);
      const context = { userId: 'user123' };

      const result = await withErrorHandling(fn, context);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(400);
      }
    });

    it('should handle generic errors', async () => {
      const error = new Error('Generic error');
      const fn = vi.fn().mockRejectedValue(error);
      const context = { userId: 'user123' };

      const result = await withErrorHandling(fn, context);

      expect(result).toBeInstanceOf(NextResponse);
      if (result instanceof NextResponse) {
        expect(result.status).toBe(500);
      }
    });
  });
});
