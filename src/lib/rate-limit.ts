/**
 * Rate limiter in-memory pour protéger les routes publiques.
 *
 * Usage:
 *   if (rateLimit('notify:VOL26-ABC', { windowMs: 60000, maxRequests: 2 })) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *   }
 *
 * Nettoyage automatique des entrées expirées toutes les 5 minutes.
 */

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
 * @returns `true` si la requête doit être rejetée (429), `false` sinon
 */
export function rateLimit(key: string, options?: RateLimitOptions): boolean {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;

  startCleanup();

  const now = Date.now();
  const entry = store.get(key);

  // Pas d'entrée ou fenêtre expirée → premier hit
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  // Dans la fenêtre → incrémenter
  entry.count += 1;

  // Dépassement → reject
  if (entry.count > maxRequests) {
    return true;
  }

  return false;
}

// ─── Predefined Limits ────────────────────────────────────────────

/** Login attempts: 5 per 15 minutes per email */
export function checkLoginRateLimit(email: string) {
  return rateLimit(`login:${email}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
}

/** Forgot password: 3 per hour per email */
export function checkForgotPasswordRateLimit(email: string) {
  return rateLimit(`forgot:${email}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
}

/** Verify email code: 5 per 15 minutes per email */
export function checkVerifyEmailRateLimit(email: string) {
  return rateLimit(`verify:${email}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
}

/** Reset password: 3 per hour per email */
export function checkResetPasswordRateLimit(email: string) {
  return rateLimit(`reset:${email}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
}

/** Staff login: 5 per 15 minutes per phone */
export function checkStaffLoginRateLimit(phone: string) {
  return rateLimit(`staff-login:${phone}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
}

/** Generic IP-based rate limit: 20 per minute */
export function checkIpRateLimit(ip: string) {
  return rateLimit(`ip:${ip}`, { maxRequests: 20, windowMs: 60 * 1000 });
}
