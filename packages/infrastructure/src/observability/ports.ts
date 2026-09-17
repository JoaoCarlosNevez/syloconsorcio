// Observability ports — abstract interfaces for error tracking and logging.
//
// The application and domain layers depend on these interfaces, never on
// Sentry or OpenTelemetry directly. This allows swapping providers without
// touching business logic.
//
// Concrete implementations are initialized in apps/api/src/observability/.
// OpenTelemetry as the instrumentation abstraction; Sentry as first provider (decisão ainda não documentada em ADR).

export type ObservabilityConfig = {
  sentryDsn?: string
  environment?: string
  release?: string
  enabled?: boolean
}

export interface ErrorTracker {
  captureException(error: Error, context?: Record<string, unknown>): void
  captureMessage(
    message: string,
    level?: 'info' | 'warning' | 'error',
    context?: Record<string, unknown>,
  ): void
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: Error, context?: Record<string, unknown>): void
}
