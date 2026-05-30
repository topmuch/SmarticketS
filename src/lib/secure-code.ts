/**
 * Secure Code Generator — Generates random 4-6 digit codes and bcrypt hashes.
 * Codes are used for staff onboarding and field login.
 */

import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';

export interface GeneratedCode {
  /** Plain-text code (4 digits) — ONLY returned once at creation */
  plain: string;
  /** bcrypt hash for secure DB storage */
  hash: string;
}

/**
 * Generate a secure 4-digit code + its bcrypt hash.
 * The plain code is ephemeral and should only be shown once to the admin.
 */
export function generateSecureCode(): GeneratedCode {
  const code = randomInt(1000, 9999).toString(); // 4 digits
  const hash = bcrypt.hashSync(code, 10);
  return { plain: code, hash };
}

/**
 * Verify a plain-text code against a stored bcrypt hash.
 */
export function verifyCode(plainCode: string, hash: string): boolean {
  return bcrypt.compareSync(plainCode, hash);
}
