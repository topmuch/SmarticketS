/**
 * Metric logger for external services (Groq, Wakit, WhatsApp, Suivi).
 * Lightweight structured logging for service metrics.
 * Separate from the main logger to avoid circular dependencies.
 */

interface MetricOptions {
  key?: string;
  details?: string;
}

export function logMetric(
  _service: 'groq' | 'wakit' | 'whatsapp' | 'suivi',
  _action: string,
  _latencyMs: number,
  _success: boolean,
  _options?: MetricOptions
): void {
  // No-op in production: metrics logging removed
}
