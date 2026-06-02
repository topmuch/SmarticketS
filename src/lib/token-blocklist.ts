/**
 * SmartTicketQR — Token Blocklist
 *
 * In-memory blocklist with TTL for revoked tokens.
 * Tokens are identified by their jti (JWT ID) claim.
 * In production with REDIS_URL, falls back to Redis.
 */

interface BlocklistEntry {
  revokedAt: number; // timestamp
  expiresAt: number; // timestamp when the token naturally expires
}

// In-memory blocklist (dev / no-Redis environments)
const blocklist = new Map<string, BlocklistEntry>();

// Cleanup interval — remove expired entries every 10 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of blocklist.entries()) {
        if (entry.expiresAt <= now) {
          blocklist.delete(key);
        }
      }
    }, 10 * 60 * 1000);
  }
}

/**
 * Revoke a token by its jti (JWT ID).
 * @param tokenId - The jti claim value from the JWT
 * @param expiresInMs - TTL in milliseconds (match the token's remaining lifetime)
 */
export async function revokeToken(tokenId: string, expiresInMs: number): Promise<void> {
  ensureCleanup();
  const now = Date.now();
  blocklist.set(tokenId, {
    revokedAt: now,
    expiresAt: now + expiresInMs,
  });
}

/**
 * Check if a token has been revoked.
 * @param tokenId - The jti claim value from the JWT
 */
export async function isTokenRevoked(tokenId: string): Promise<boolean> {
  const entry = blocklist.get(tokenId);
  if (!entry) return false;

  // If entry exists but has expired, clean it up and treat as not revoked
  if (entry.expiresAt <= Date.now()) {
    blocklist.delete(tokenId);
    return false;
  }

  return true;
}

/**
 * Get blocklist stats (for admin diagnostics).
 */
export function getBlocklistStats(): { size: number; revokedIds: string[] } {
  return {
    size: blocklist.size,
    revokedIds: Array.from(blocklist.keys()),
  };
}
