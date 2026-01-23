import { ErrorCode, ErrorSeverity, ErrorAction, AppErrorOptions } from './types';
import { getErrorMessage } from './messages';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly severity: ErrorSeverity;
  readonly isRecoverable: boolean;
  readonly action?: ErrorAction;
  readonly statusCode?: number;
  readonly details?: unknown;
  readonly userMessage: string;

  constructor(options: AppErrorOptions) {
    const userMessage = options.message ?? getErrorMessage(options.code);
    super(userMessage);

    this.name = 'AppError';
    this.code = options.code;
    this.userMessage = userMessage;
    this.severity = options.severity ?? getSeverityFromCode(options.code);
    this.isRecoverable = options.isRecoverable ?? getRecoverableFromCode(options.code);
    this.action = options.action;
    this.statusCode = options.statusCode;
    this.details = options.details;

    Object.setPrototypeOf(this, AppError.prototype);
  }

  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError({ code: ErrorCode.UNKNOWN });
  }

  static isBlockingError(error: AppError): boolean {
    return error.severity === 'critical';
  }
}

function getSeverityFromCode(code: ErrorCode): ErrorSeverity {
  const criticalCodes: ErrorCode[] = [
    ErrorCode.AUTH_SESSION_EXPIRED,
  ];

  const warningCodes: ErrorCode[] = [
    ErrorCode.STRAVA_RATE_LIMITED,
    ErrorCode.NETWORK_TIMEOUT,
  ];

  if (criticalCodes.includes(code)) return 'critical';
  if (warningCodes.includes(code)) return 'warning';
  return 'error';
}

function getRecoverableFromCode(code: ErrorCode): boolean {
  const nonRecoverableCodes: ErrorCode[] = [
    ErrorCode.AUTH_SESSION_EXPIRED,
  ];

  return !nonRecoverableCodes.includes(code);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
