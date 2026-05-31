/**
 * PWA Guard — Security utilities for PWA routes (Controller & Driver)
 *
 * Generates and validates short-lived JWT-like tokens that bind a PWA URL
 * to a specific agency. Tokens are valid for 24 hours by default.
 *
 * Signing uses HMAC-SHA256 with NEXTAUTH_SECRET (or a fallback).
 * No external JWT library required — uses Node.js built-in crypto.
 */

// ─── Configuration ─────────────────────────────────────────────────────

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_ALGORITHM = 'HS256';
const ISSUER = 'smartickets-pwa';

function getSigningSecret(): string {
  return process.env.NEXTAUTH_SECRET || 'smartickets-pwa-fallback-secret';
}

// ─── Payload Types ──────────────────────────────────────────────────────

export interface PwaTokenPayload {
  /** Agency ID this token is bound to */
  agencyId: string;
  /** Agency display name */
  agencyName: string;
  /** Which PWA role this token grants access to */
  role: 'controller' | 'driver';
  /** Token expiry timestamp (epoch ms) */
  exp: number;
  /** Token issued at (epoch ms) */
  iat: number;
  /** Unique token ID for revocation tracking */
  jti: string;
}

export interface PwaTokenValidation {
  valid: boolean;
  payload?: PwaTokenPayload;
  error?: string;
}

// ─── Base64URL Helpers ─────────────────────────────────────────────────

function base64UrlEncode(data: string): string {
  return Buffer.from(data, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (data.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

// ─── HMAC-SHA256 Signing ───────────────────────────────────────────────

async function createHmacSha256Signature(payload: string): Promise<string> {
  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', getSigningSecret());
  hmac.update(payload);
  return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function verifyHmacSha256Signature(payload: string, signature: string): Promise<boolean> {
  const expected = await createHmacSha256Signature(payload);
  return expected === signature;
}

// ─── Token Generation (Server-side only) ───────────────────────────────

/**
 * Generate a signed PWA access token.
 * Only call this from server-side code (API routes, server components).
 *
 * @param agencyId - The agency this token is scoped to
 * @param agencyName - Display name for the agency
 * @param role - Which PWA role ('controller' or 'driver')
 * @param expiryMs - Token duration in ms (default 24h)
 * @returns Signed token string (header.payload.signature)
 */
export async function generatePwaToken(
  agencyId: string,
  agencyName: string,
  role: 'controller' | 'driver',
  expiryMs: number = TOKEN_EXPIRY_MS,
): Promise<string> {
  const now = Date.now();
  const crypto = await import('crypto');

  const payload: Omit<PwaTokenPayload, 'jti'> & { jti: string } = {
    agencyId,
    agencyName,
    role,
    exp: now + expiryMs,
    iat: now,
    jti: crypto.randomUUID(),
  };

  const header = base64UrlEncode(JSON.stringify({ alg: TOKEN_ALGORITHM, typ: 'JWT', iss: ISSUER }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = await createHmacSha256Signature(signingInput);

  return `${signingInput}.${signature}`;
}

// ─── Token Validation (Can be used client-side or server-side) ─────────

/**
 * Validate a PWA token and return its payload if valid.
 *
 * @param token - The raw token string (header.payload.signature)
 * @param expectedRole - Optionally restrict to a specific role
 * @returns Validation result with payload if valid
 */
export async function validatePwaToken(
  token: string,
  expectedRole?: 'controller' | 'driver',
): Promise<PwaTokenValidation> {
  try {
    // Split into 3 parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Format de token invalide' };
    }

    const [headerB64, payloadB64, signature] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    // Verify signature
    const isValid = await verifyHmacSha256Signature(signingInput, signature);
    if (!isValid) {
      return { valid: false, error: 'Signature invalide' };
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as PwaTokenPayload;

    // Check expiry
    if (payload.exp < Date.now()) {
      return { valid: false, error: 'Token expiré' };
    }

    // Check issuer
    if (payload.iat && payload.exp - payload.iat > TOKEN_EXPIRY_MS * 2) {
      return { valid: false, error: 'Durée de vie anormale' };
    }

    // Check role restriction
    if (expectedRole && payload.role !== expectedRole) {
      return { valid: false, error: `Token non autorisé pour le rôle ${expectedRole}` };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Erreur de validation du token' };
  }
}

// ─── URL Builder ──────────────────────────────────────────────────────

/**
 * Build a secure PWA URL with embedded token.
 * Call this on the server when generating QR codes.
 *
 * @param basePath - The PWA route path (e.g., '/controller/validate')
 * @param token - A valid signed token from generatePwaToken()
 * @param origin - Optional origin override (for server-side generation)
 */
export function buildSecurePwaUrl(
  basePath: string,
  token: string,
  origin?: string,
): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${basePath}?token=${encodeURIComponent(token)}`;
}

// ─── Client-side Hook ──────────────────────────────────────────────────

/**
 * Extract and validate the PWA token from the current URL query params.
 * Designed to be called from a useEffect in PWA pages.
 *
 * @param expectedRole - Optional role restriction
 * @returns The validated payload or null
 */
export async function extractPwaTokenFromUrl(
  expectedRole?: 'controller' | 'driver',
): Promise<PwaTokenPayload | null> {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) return null;

  const result = await validatePwaToken(token, expectedRole);
  return result.valid && result.payload ? result.payload : null;
}
