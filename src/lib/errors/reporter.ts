type ErrorReporter = (error: unknown) => void;

let globalErrorReporter: ErrorReporter | null = null;

export function setGlobalErrorReporter(reporter: ErrorReporter) {
  globalErrorReporter = reporter;
}

export function reportError(error: unknown) {
  if (globalErrorReporter) {
    globalErrorReporter(error);
  }
}
