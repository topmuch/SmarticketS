/**
 * SmartTicketQR — Secure Code Generation
 *
 * All sensitive codes (control codes, PINs, QR hashes) MUST use
 * crypto.randomInt() / crypto.randomBytes() — never Math.random().
 *
 * crypto.randomInt() is cryptographically secure and suitable for
 * security-sensitive code generation.
 */

import { randomInt, randomBytes } from "crypto";

// ============================================
// Control Code (6-8 digits)
// ============================================

/**
 * Generate a cryptographically secure control code (6-8 digits).
 * Range: 100000 (6 digits) to 99999999 (8 digits).
 */
export function secureControlCode(minDigits = 6, maxDigits = 8): string {
  const min = Math.pow(10, minDigits);     // 100000
  const max = Math.pow(10, maxDigits) - 1;  // 99999999
  return randomInt(min, max + 1).toString();
}

// ============================================
// PIN Code (4 digits)
// ============================================

/**
 * Generate a cryptographically secure 4-digit PIN code.
 * Range: 1000 to 9999 (always 4 digits).
 */
export function securePinCode(): string {
  return randomInt(1000, 10000).toString();
}

// ============================================
// QR Hash (32 bytes hex)
// ============================================

/**
 * Generate a cryptographically secure hash for QR codes (64 hex chars).
 */
export function secureQrHash(): string {
  return randomBytes(32).toString("hex");
}

// ============================================
// Unique Code Generator (with DB uniqueness check)
// ============================================

/**
 * Generate a unique code, retrying until no collision is found.
 *
 * @param generator - Function that produces a random code
 * @param checker - Async function that returns true if the code already exists
 * @param maxAttempts - Maximum retry attempts before throwing
 */
export async function generateUniqueCode(
  generator: () => string,
  checker: (code: string) => Promise<boolean>,
  maxAttempts = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generator();
    const exists = await checker(code);
    if (!exists) return code;
  }
  throw new Error(
    `Échec de génération de code unique après ${maxAttempts} tentatives`
  );
}
