/**
 * In-memory rate limiter for API endpoints.
 * 
 * Protects against brute-force attacks on auth endpoints.
 * Uses a sliding window counter algorithm.
 * 
 * In production with multiple instances, replace the Map
 * with Redis (Upstash, ioredis) for shared state.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Check rate limit for a given key.
 * 
 * @param key - Unique identifier (email, IP, phone, etc.)
 * @param maxRequests - Maximum allowed requests in the window
 * @param windowMs - Window duration in milliseconds
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetInMs: number } {
  // Ensure cleanup timer is running
  startCleanup();

  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired window → allow and create
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInMs: windowMs,
    };
  }

  // Within window
  if (entry.count < maxRequests) {
    entry.count += 1;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetInMs: entry.resetAt - now,
    };
  }

  // Rate limited
  return {
    allowed: false,
    remaining: 0,
    resetInMs: entry.resetAt - now,
  };
}

// ─── Predefined Limits ────────────────────────────────────────────

/** Login attempts: 5 per 15 minutes per email */
export function checkLoginRateLimit(email: string) {
  return rateLimit(`login:${email}`, 5, 15 * 60 * 1000);
}

/** Forgot password: 3 per hour per email */
export function checkForgotPasswordRateLimit(email: string) {
  return rateLimit(`forgot:${email}`, 3, 60 * 60 * 1000);
}

/** Verify email code: 5 per 15 minutes per email */
export function checkVerifyEmailRateLimit(email: string) {
  return rateLimit(`verify:${email}`, 5, 15 * 60 * 1000);
}

/** Reset password: 3 per hour per email */
export function checkResetPasswordRateLimit(email: string) {
  return rateLimit(`reset:${email}`, 3, 60 * 60 * 1000);
}

/** Staff login: 5 per 15 minutes per phone */
export function checkStaffLoginRateLimit(phone: string) {
  return rateLimit(`staff-login:${phone}`, 5, 15 * 60 * 1000);
}

/** Generic IP-based rate limit: 20 per minute */
export function checkIpRateLimit(ip: string) {
  return rateLimit(`ip:${ip}`, 20, 60 * 1000);
}
