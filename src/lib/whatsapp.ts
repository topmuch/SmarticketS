/**
 * WhatsApp Utility — Normalization, template builder, wa.me link encoder
 *
 * Handles phone number normalization to E.164 format,
 * builds dynamic WhatsApp message templates, and generates wa.me deep links.
 */

import { cleanPhone } from '@/lib/wame';

// ─── Phone Normalization ────────────────────────────────────────────

/**
 * Normalize a phone number to E.164 format.
 * Regex validation: ^\+?[0-9]{9,15}$
 *
 * Handles common formats: +221 77 123 45 67, 221771234567, 0771234567
 *
 * @param phone - Raw phone input
 * @returns Normalized E.164 phone or null if invalid
 */
export function normalizePhone(phone: string): string | null {
  // Strip all non-digit characters (except leading +)
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, validate as E.164
  if (cleaned.startsWith('+')) {
    const digits = cleaned.substring(1);
    if (/^[0-9]{9,15}$/.test(digits)) return cleaned;
    return null;
  }

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
    if (/^\+[0-9]{9,15}$/.test(cleaned)) return cleaned;
    return null;
  }

  // If no country code (9 digits), assume Senegal (+221)
  if (/^[0-9]{9}$/.test(cleaned)) {
    return '+221' + cleaned;
  }

  // If 10+ digits without +, add +
  if (/^[0-9]{9,15}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  return null;
}

/**
 * Validate a phone string against the expected regex pattern
 */
export function isValidPhoneFormat(phone: string): boolean {
  return /^\+?[0-9]{9,15}$/.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * Mask a phone number for display: +221771234567 → +221 77 123 45 67
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 9) return phone;

  // Senegal format: +221 XX XXX XX XX
  if (digits.length === 12 && digits.startsWith('221')) {
    return `+${digits[0]}${digits[1]}${digits[2]} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }

  // Generic format: +XXX XXXX XXXX
  if (digits.length >= 10) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
  }

  return phone;
}

// ─── WhatsApp Template Builder ─────────────────────────────────────

/**
 * Build the onboarding WhatsApp message for a new staff member.
 * Uses emoji, staff name, role, code, agency name, PWA login URL.
 */
export function buildOnboardingMessage(staff: {
  name: string;
  role: string;
  code: string;
  agencyName: string;
  pwaUrl: string;
}): string {
  const { name, role, code, agencyName, pwaUrl } = staff;

  return [
    `🎫 *SmarticketS — Accès Terrain*`,
    ``,
    `Bonjour *${name}*,`,
    `Votre compte *${role}* a été créé chez *${agencyName}*.`,
    ``,
    `🔑 *Code d'accès : ${code}*`,
    `📲 Lien d'installation : ${pwaUrl}`,
    ``,
    `⚠️ Ne partagez jamais ce code.`,
    `Connectez-vous via l'application PWA installée.`,
    ``,
    `Équipe SmarticketS 🚀`,
  ].join('\n');
}

/**
 * Build a simple WhatsApp message (backward-compatible signature).
 */
export function buildWhatsappMessage(params: {
  name: string;
  code: string;
  role: string;
  pwaUrl: string;
}): string {
  return buildOnboardingMessage({
    ...params,
    agencyName: 'SmarticketS',
  });
}

// ─── wa.me Link Generator ───────────────────────────────────────────

/**
 * Generate a wa.me deep link with a pre-filled message.
 * Uses `cleanPhone` from `@/lib/wame` for phone cleaning.
 *
 * @param phone - E.164 formatted phone (ex: +221771234567)
 * @param message - The pre-filled message text
 * @returns Full wa.me URL
 */
export function buildWhatsappLink(phone: string, message: string): string {
  const cleaned = cleanPhone(phone).replace(/^\+/, ''); // Remove + for wa.me URL
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/**
 * Build a wa.me link (backward-compatible alias).
 */
export function buildWaLink(phone: string, message: string): string {
  return buildWhatsappLink(phone, message);
}

/**
 * Generate a WhatsApp link for onboarding a staff member.
 *
 * @param phone - E.164 formatted phone
 * @param params - { name, code, role, agencyName, pwaUrl }
 * @returns Full wa.me URL with pre-filled onboarding message
 */
export function buildOnboardingWaLink(
  phone: string,
  params: { name: string; code: string; role: string; pwaUrl: string; agencyName?: string }
): string {
  const message = buildOnboardingMessage({
    name: params.name,
    code: params.code,
    role: params.role,
    agencyName: params.agencyName || 'SmarticketS',
    pwaUrl: params.pwaUrl,
  });
  return buildWhatsappLink(phone, message);
}
