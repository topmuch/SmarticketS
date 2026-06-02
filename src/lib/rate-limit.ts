/**
 * Rate limiter in-memory pour protéger les routes publiques.
 *
 * Usage:
 *   const rl = rateLimit('notify:VOL26-ABC', { windowMs: 60000, maxRequests: 2 });
 *   if (!rl.allowed) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *   }
 *
 * Nettoyage automatique des entrées expirées toutes les 5 minutes.
 */

export interface RateLimitResult {
  allowed: boolean;
  resetInMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Fenêtre de temps en ms (défaut: 60 000 = 1 min) */
  windowMs?: number;
  /** Nombre max de requêtes dans la fenêtre (défaut: 3) */
  maxRequests?: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 3;
const CLEANUP_INTERVAL_MS = 300_000; // 5 min

// Store in-memory — réinitialisé au redémarrage du serveur (acceptable pour ce use case)
const store = new Map<string, RateLimitEntry>();

// Nettoyage périodique
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Ne pas bloquer le processus de sortie
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Vérifie si la clé a dépassé le rate limit.
 *
 * @param key - Clé unique (ex: `notify:VOL26-ABC123`)
 * @param options - Fenêtre et max requêtes
 * @returns `RateLimitResult` — `allowed: false` if rate limited, `true` otherwise
 */
export function rateLimit(key: string, options?: RateLimitOptions): RateLimitResult {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;

  startCleanup();

  const now = Date.now();
  const entry = store.get(key);

  // Pas d'entrée ou fenêtre expirée → premier hit
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, resetInMs: windowMs };
  }

  // Dans la fenêtre → incrémenter
  entry.count += 1;

  // Dépassement → reject
  if (entry.count > maxRequests) {
    return { allowed: false, resetInMs: entry.resetAt - now };
  }

  return { allowed: true, resetInMs: entry.resetAt - now };
}

// ─── Predefined Limits ────────────────────────────────────────────

/** Login attempts: 5 per 15 minutes per email */
export function checkLoginRateLimit(email: string): RateLimitResult {
  return rateLimit(`login:${email}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
}

/** Forgot password: 3 per hour per email */
export function checkForgotPasswordRateLimit(email: string): RateLimitResult {
  return rateLimit(`forgot:${email}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
}

/** Verify email code: 5 per 15 minutes per email */
export function checkVerifyEmailRateLimit(email: string): RateLimitResult {
  return rateLimit(`verify:${email}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
}

/** Reset password: 3 per hour per email */
export function checkResetPasswordRateLimit(email: string): RateLimitResult {
  return rateLimit(`reset:${email}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
}

/** Staff login: 5 per 15 minutes per phone */
export function checkStaffLoginRateLimit(phone: string): RateLimitResult {
  return rateLimit(`staff-login:${phone}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
}

/** Generic IP-based rate limit: 20 per minute */
export function checkIpRateLimit(ip: string): RateLimitResult {
  return rateLimit(`ip:${ip}`, { maxRequests: 20, windowMs: 60 * 1000 });
}
