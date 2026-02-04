import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  handleApiRequest,
  handleApiError,
  handleGetRequest,
  handleDeleteRequest,
} from '../api-handlers';

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/server/auth/middleware', () => ({
  requireAuth: vi.fn(),
}));

import { logger } from '@/server/infrastructure/logger';
import { requireAuth } from '@/server/auth/middleware';

describe('api-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiRequest', () => {
    it('should successfully handle authenticated request with schema', async () => {
      const schema = z.object({ name: z.string() });
      const requestBody = { name: 'Test Session' };

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true }, { status: 200 })
      );

      const response = await handleApiRequest(mockRequest, schema, handler, {
        logContext: 'test',
      });

      expect(requireAuth).toHaveBeenCalledWith(mockRequest);
      expect(mockRequest.json).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(requestBody, 'user-123');
      expect(response.status).toBe(200);
    });

    it('should handle request without schema validation', async () => {
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true }, { status: 200 })
      );

      const response = await handleApiRequest(mockRequest, null, handler);

      expect(handler).toHaveBeenCalledWith({}, 'user-123');
      expect(response.status).toBe(200);
    });

    it('should return 401 when authentication fails', async () => {
      const schema = z.object({ name: z.string() });
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const handler = vi.fn();

      const response = await handleApiRequest(mockRequest, schema, handler);

      expect(requireAuth).toHaveBeenCalledWith(mockRequest);
      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should return custom auth error message when provided', async () => {
      const schema = z.object({ name: z.string() });
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const handler = vi.fn();

      const response = await handleApiRequest(mockRequest, schema, handler, {
        authErrorMessage: 'Custom auth error',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: 'Custom auth error' });
    });

    it('should skip authentication when requireAuth is false', async () => {
      const schema = z.object({ name: z.string() });
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ name: 'Test' }),
      } as unknown as NextRequest;

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true }, { status: 200 })
      );

      const response = await handleApiRequest(mockRequest, schema, handler, {
        requireAuth: false,
      });

      expect(requireAuth).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith({ name: 'Test' }, '');
      expect(response.status).toBe(200);
    });

    it('should handle validation errors', async () => {
      const schema = z.object({ name: z.string() });
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ name: 123 }), // Invalid: number instead of string
      } as unknown as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn();

      const response = await handleApiRequest(mockRequest, schema, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle errors thrown by handler', async () => {
      const schema = z.object({ name: z.string() });
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ name: 'Test' }),
      } as unknown as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

      const response = await handleApiRequest(mockRequest, schema, handler);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Handler error');
    });
  });

  describe('handleApiError', () => {
    it('should handle ZodError with validation details', () => {
      const schema = z.object({ name: z.string() });

      let zodError: ZodError;
      try {
        schema.parse({ name: 123 });
      } catch (error) {
        zodError = error as ZodError;
      }

      const response = handleApiError(zodError!, 'test-context');

      expect(response.status).toBe(400);
      expect(logger.warn).toHaveBeenCalledWith(
        { error: zodError!.issues, context: 'test-context' },
        'Validation error'
      );
    });

    it('should handle Error with statusCode property', () => {
      const error = new Error('Not found');
      (error as Error & { statusCode: number }).statusCode = 404;

      const response = handleApiError(error, 'test-context');

      expect(response.status).toBe(404);
      expect(logger.error).toHaveBeenCalledWith(
        { error, context: 'test-context' },
        'Error in test-context'
      );
    });

    it('should handle Error with status property', () => {
      const error = new Error('Forbidden');
      (error as Error & { status: number }).status = 403;

      const response = handleApiError(error, 'test-context');

      expect(response.status).toBe(403);
    });

    it('should default to 500 for Error without status', () => {
      const error = new Error('Generic error');

      const response = handleApiError(error, 'test-context');

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle unknown error types', () => {
      const error = 'String error';

      const response = handleApiError(error, 'test-context');

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(
        { error, context: 'test-context' },
        'Unknown error in test-context'
      );
    });

    it('should use default context when not provided', () => {
      const error = new Error('Test error');

      handleApiError(error);

      expect(logger.error).toHaveBeenCalledWith(
        { error, context: 'api-error' },
        'Error in api-error'
      );
    });
  });

  describe('handleGetRequest', () => {
    it('should successfully handle authenticated GET request', async () => {
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'test' }, { status: 200 })
      );

      const response = await handleGetRequest(mockRequest, handler);

      expect(requireAuth).toHaveBeenCalledWith(mockRequest);
      expect(handler).toHaveBeenCalledWith('user-123', mockRequest);
      expect(response.status).toBe(200);
    });

    it('should return 401 when authentication fails', async () => {
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const handler = vi.fn();

      const response = await handleGetRequest(mockRequest, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should skip authentication when requireAuth is false', async () => {
      const mockRequest = {} as NextRequest;

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'public' }, { status: 200 })
      );

      const response = await handleGetRequest(mockRequest, handler, {
        requireAuth: false,
      });

      expect(requireAuth).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith('', mockRequest);
      expect(response.status).toBe(200);
    });

    it('should handle errors thrown by handler', async () => {
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

      const response = await handleGetRequest(mockRequest, handler);

      expect(response.status).toBe(500);
    });
  });

  describe('handleDeleteRequest', () => {
    it('should successfully handle authenticated DELETE request', async () => {
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true }, { status: 200 })
      );

      const response = await handleDeleteRequest(mockRequest, handler);

      expect(requireAuth).toHaveBeenCalledWith(mockRequest);
      expect(handler).toHaveBeenCalledWith('user-123');
      expect(response.status).toBe(200);
    });

    it('should return 401 when authentication fails', async () => {
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      });

      const handler = vi.fn();

      const response = await handleDeleteRequest(mockRequest, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should skip authentication when requireAuth is false', async () => {
      const mockRequest = {} as NextRequest;

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true }, { status: 200 })
      );

      const response = await handleDeleteRequest(mockRequest, handler, {
        requireAuth: false,
      });

      expect(requireAuth).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith('');
      expect(response.status).toBe(200);
    });

    it('should handle errors thrown by handler', async () => {
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn().mockRejectedValue(new Error('Delete failed'));

      const response = await handleDeleteRequest(mockRequest, handler);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Delete failed');
    });

    it('should use custom logContext in options', async () => {
      const mockRequest = {} as NextRequest;

      (requireAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        userId: 'user-123',
      });

      const handler = vi.fn().mockRejectedValue(new Error('Test error'));

      await handleDeleteRequest(mockRequest, handler, {
        logContext: 'custom-delete',
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'custom-delete' }),
        expect.any(String)
      );
    });
  });
});
