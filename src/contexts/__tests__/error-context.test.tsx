import { renderHook, act } from '@testing-library/react';
import { ErrorProvider, useErrorContext } from '../error-context';
import { AppError, ErrorCode } from '@/lib/errors';
import { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <ErrorProvider>{children}</ErrorProvider>
);

describe('ErrorContext', () => {
  it('should provide default values', () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });

    expect(result.current.blockingError).toBeNull();
    expect(result.current.reportError).toBeDefined();
  });

  it('should report blocking error', () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    
    const blockingError = new AppError({
      code: ErrorCode.AUTH_SESSION_EXPIRED,
      message: 'Session expired',
      severity: 'critical',
      isRecoverable: false,
    });

    act(() => {
      result.current.reportError(blockingError);
    });

    expect(result.current.blockingError).not.toBeNull();
    expect(result.current.blockingError?.error.code).toBe(ErrorCode.AUTH_SESSION_EXPIRED);
  });

  it('should report non-blocking error via toast', async () => {
    const { toast } = await import('@/hooks/use-toast');
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    
    const error = new AppError({
      code: ErrorCode.NETWORK_SERVER_ERROR,
      message: 'API Failed',
      severity: 'error',
      isRecoverable: true,
    });

    act(() => {
      result.current.reportError(error);
    });

    expect(result.current.blockingError).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Erreur',
      description: 'API Failed',
    }));
  });

  it('should clear blocking error', () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    
    act(() => {
      result.current.reportError(new AppError({
        code: ErrorCode.AUTH_SESSION_EXPIRED,
        message: 'Expired',
        isRecoverable: false,
      }));
    });
    
    expect(result.current.blockingError).not.toBeNull();

    act(() => {
      result.current.dismissBlockingError();
    });

    expect(result.current.blockingError).toBeNull();
  });
});
