/**
 * @deprecated Use `import { rateLimit, checkLoginRateLimit, ... } from '@/lib/rate-limit'` instead.
 * This module re-exports from rate-limit.ts for backward compatibility.
 */

export { rateLimit as _rateLimitDeprecated } from './rate-limit';
import { rateLimit } from './rate-limit';

/**
 * Check rate limit for a given key.
 * Returns true if the request should be rejected (429).
 * 
 * @deprecated Use `rateLimit(key, maxRequests, windowMs).allowed === false` instead.
 */
export function rateLimitSimple(
  key: string,
  maxRequests: number = 3,
  windowMs: number = 60_000
): boolean {
  const result = rateLimit(key, maxRequests, windowMs);
  return !result.allowed;
}
