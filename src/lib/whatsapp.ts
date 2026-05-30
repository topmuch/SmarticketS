/**
 * WhatsApp Utility — Normalization, template builder, wa.me link encoder
 *
 * Handles phone number normalization to E.164 format,
 * builds dynamic WhatsApp message templates, and generates wa.me deep links.
 */

// ─── Phone Normalization ────────────────────────────────────────────

/**
 * Normalize a phone number to E.164 format.
 * Handles common formats: +221 77 123 45 67, 221771234567, 0771234567
 *
 * @param phone - Raw phone input
 * @returns Normalized E.164 phone or null if invalid
 */
export function normalizePhone(phone: string): string | null {
  // Strip all non-digit characters (except leading +)
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep as is (already E.164)
  if (cleaned.startsWith('+')) {
    // Validate: + followed by 10-15 digits
    const digits = cleaned.substring(1);
    if (/^\d{10,15}$/.test(digits)) return cleaned;
    return null;
  }

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
    if (/^\+\d{10,15}$/.test(cleaned)) return cleaned;
    return null;
  }

  // If no country code, assume Senegal (+221)
  if (/^\d{9}$/.test(cleaned)) {
    return '+221' + cleaned;
  }

  // If 10+ digits without +, add +
  if (/^\d{10,15}$/.test(cleaned)) {
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
 */
export function buildWhatsappMessage(params: {
  name: string;
  code: string;
  role: string;
  pwaUrl: string;
}): string {
  const { name, code, role, pwaUrl } = params;

  return [
    `🎫 *SmartTicketS — Accès Terrain*`,
    ``,
    `Bonjour ${name},`,
    `Votre compte *${role}* a été créé.`,
    ``,
    `🔑 *Code d'accès : ${code}*`,
    `📲 Lien d'installation : ${pwaUrl}`,
    ``,
    `⚠️ Ne partagez jamais ce code.`,
    `Connectez-vous via l'application PWA installée.`,
    ``,
    `Équipe SmartTicketS`,
  ].join('\n');
}

// ─── wa.me Link Generator ───────────────────────────────────────────

/**
 * Generate a wa.me deep link with a pre-filled message.
 *
 * @param phone - E.164 formatted phone (ex: +221771234567)
 * @param message - The pre-filled message text
 * @returns Full wa.me URL
 */
export function buildWaLink(phone: string, message: string): string {
  // Strip the + for wa.me (it expects just digits with country code)
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate a WhatsApp link for onboarding a staff member.
 *
 * @param phone - E.164 formatted phone
 * @param params - { name, code, role, pwaUrl }
 * @returns Full wa.me URL with pre-filled onboarding message
 */
export function buildOnboardingWaLink(
  phone: string,
  params: { name: string; code: string; role: string; pwaUrl: string }
): string {
  const message = buildWhatsappMessage(params);
  return buildWaLink(phone, message);
}
