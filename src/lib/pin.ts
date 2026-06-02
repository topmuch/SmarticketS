/**
 * SmartTicketQR — PIN Generation & Verification Utilities
 *
 * Handles PIN lifecycle for terrain (PWA) staff authentication:
 * - Random numeric PIN generation (4-6 digits)
 * - bcrypt hashing & verification (reuses password salt rounds)
 * - Expiry management (30-day validity with auto-extend on login)
 */

import bcrypt from "bcryptjs";

// PIN validity period: 30 days in milliseconds
const PIN_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Generate a random numeric PIN.
 * Uses crypto.randomInt for cryptographic security.
 *
 * @param length - Number of digits (default: 4)
 * @returns Numeric string, e.g. "3847"
 */
export function generatePin(length: number = 4): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length; // exclusive upper bound
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  const pin = min + (array[0] % (max - min));
  return pin.toString().padStart(length, "0");
}

/**
 * Hash a PIN using bcrypt (same salt rounds as password hashing).
 *
 * @param pin - Plaintext PIN string
 * @returns bcrypt hash string
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

/**
 * Verify a plaintext PIN against a bcrypt hash.
 *
 * @param pin - Plaintext PIN string
 * @param hash - bcrypt hash string
 * @returns true if PIN matches
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Check whether a PIN has expired.
 * Returns true if pinExpiresAt is null or older than 30 days.
 *
 * @param pinExpiresAt - The PIN expiry timestamp (nullable)
 * @returns true if expired
 */
export function isPinExpired(pinExpiresAt: Date | null): boolean {
  if (!pinExpiresAt) return true;
  return Date.now() > pinExpiresAt.getTime();
}

/**
 * Extend PIN expiry to 30 days from now.
 *
 * @returns New expiry Date
 */
export function extendPinExpiry(): Date {
  return new Date(Date.now() + PIN_VALIDITY_MS);
}
