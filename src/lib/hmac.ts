/**
 * HMAC-SHA256 QR Code Security Module
 *
 * Generates tamper-proof QR codes for tickets and baggage.
 * Each QR encodes a payload signed with HMAC-SHA256.
 * Validation recomputes the HMAC and checks expiry.
 *
 * Payload structure:  base64(json_data).hmac_hex.timestamp
 *   - json_data: { ref, controlCode, agencyId, passengerPhone, ... }
 *   - hmac_hex:   HMAC-SHA256(payload, secret).hex()
 *   - timestamp:  unix ms at generation (for expiry check)
 */

import crypto from 'crypto';

// ─── Secret ──────────────────────────────────────────────────
const HMAC_SECRET = process.env.QR_HMAC_SECRET || crypto.randomBytes(32).toString('hex');

// Expiry: 24 hours for QR codes (configurable)
const QR_EXPIRY_MS = 24 * 60 * 60 * 1000;

// ─── Types ──────────────────────────────────────────────────

export interface HmacPayload {
  ref: string;
  controlCode?: string;
  agencyId?: string;
  passengerPhone?: string;
  baggageType?: string;
  departureId?: string;
}

export interface HmacResult {
  token: string;         // Full token: base64(payload).hmac.timestamp
  payload: string;       // Base64-encoded JSON payload
  hmac: string;          // HMAC hex
  timestamp: number;     // Unix ms at generation
  expiresAt: number;     // Unix ms when token expires
  qrData: string;        // Data to encode in QR (the full token)
}

export interface HmacValidation {
  valid: boolean;
  payload: HmacPayload | null;
  reason: string;
  expired: boolean;
}

// ─── Generate HMAC token ────────────────────────────────────

/**
 * Generate a signed HMAC token for a QR code.
 *
 * @param data - Payload data to encode
 * @param expiresInMs - Optional custom expiry (default: 24h)
 * @returns HmacResult with token, components, and qrData
 */
export function generateHmacToken(
  data: HmacPayload,
  expiresInMs?: number
): HmacResult {
  const timestamp = Date.now();
  const expiry = expiresInMs || QR_EXPIRY_MS;
  const expiresAt = timestamp + expiry;

  // JSON payload
  const payloadJson = JSON.stringify({
    ...data,
    _exp: expiresAt,
    _ts: timestamp,
  });

  // Base64 encode
  const payload = Buffer.from(payloadJson, 'utf-8').toString('base64url');

  // HMAC-SHA256
  const hmac = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('hex');

  // Full token: payload.hmac.timestamp
  const token = `${payload}.${hmac}.${timestamp}`;

  return {
    token,
    payload,
    hmac,
    timestamp,
    expiresAt,
    qrData: token,
  };
}

// ─── Validate HMAC token ────────────────────────────────────

/**
 * Validate an HMAC token.
 * Checks: signature, expiry, payload integrity.
 *
 * @param token - The full token string (payload.hmac.timestamp)
 * @returns HmacValidation result
 */
export function validateHmacToken(token: string): HmacValidation {
  const parts = token.split('.');

  if (parts.length !== 3) {
    return { valid: false, payload: null, reason: 'FORMAT_INVALID', expired: false };
  }

  const [payload, hmac, tsStr] = parts;

  // Verify HMAC
  const expectedHmac = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
    return { valid: false, payload: null, reason: 'SIGNATURE_MISMATCH', expired: false };
  }

  // Decode payload
  let parsed: Record<string, unknown>;
  try {
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    parsed = JSON.parse(json);
  } catch {
    return { valid: false, payload: null, reason: 'PAYLOAD_CORRUPT', expired: false };
  }

  // Check expiry
  const exp = parsed._exp as number | undefined;
  if (exp && Date.now() > exp) {
    return { valid: false, payload: null, reason: 'TOKEN_EXPIRED', expired: true };
  }

  // Return validated payload (strip internal fields)
  const { _exp, _ts, ...cleanPayload } = parsed;

  return {
    valid: true,
    payload: cleanPayload as unknown as HmacPayload,
    reason: 'VALID',
    expired: false,
  };
}

// ─── Generate HMAC for QR reference lookup ──────────────────

/**
 * Generate a simple HMAC signature for a reference string.
 * Used for QR code scan → reference lookup.
 *
 * @param reference - The baggage/ticket reference
 * @returns { hmac, reference } object
 */
export function signReference(reference: string): { hmac: string; reference: string } {
  const hmac = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(reference)
    .digest('hex')
    .substring(0, 16); // Truncate to 16 hex chars for compact QR

  return { hmac, reference };
}

/**
 * Verify a reference against its HMAC signature.
 */
export function verifyReference(reference: string, hmac: string): boolean {
  const expected = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(reference)
    .digest('hex')
    .substring(0, 16);

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
}
