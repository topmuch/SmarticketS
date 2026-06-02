/**
 * SmartTicketQR — Dynamic WhatsApp Onboarding Templates
 *
 * Generates branded onboarding messages for new staff members,
 * sent via WhatsApp when an admin creates staff accounts.
 * Two distinct templates: web (ADMIN/OPERATOR) and field (DRIVER/CONTROLLER).
 */

import { BRAND } from "./constants";

// ============================================
// Web Onboarding — ADMIN / OPERATOR
// ============================================

/**
 * Generate WhatsApp onboarding message for web dashboard users (ADMIN, OPERATOR).
 *
 * @param staff - Staff member info (name, email)
 * @param password - Temporary password (shown once)
 * @param baseUrl - Application base URL
 * @returns Formatted WhatsApp message string
 */
export function getWebOnboardingMessage(
  staff: { name: string; email: string },
  password: string,
  baseUrl: string
): string {
  return [
    `👋 *Bienvenue chez ${BRAND.name.toUpperCase()} !*`,
    ``,
    `Bonjour ${staff.name}, votre compte a été créé avec succès.`,
    ``,
    `📋 *Vos identifiants de connexion :*`,
    `📧 Email : ${staff.email}`,
    `🔑 Mot de passe : ${password}`,
    ``,
    `🌐 *Connexion :*`,
    `${baseUrl}`,
    ``,
    `📱 Accédez à votre tableau de bord pour gérer les tickets, colis, et plus.`,
    ``,
    `⚠️ *Important :*`,
    `• Changez votre mot de passe dès votre première connexion`,
    `• Ne partagez jamais vos identifiants`,
    ``,
    ` Besoin d'aide ? Contactez-nous !`,
    `📞 ${BRAND.supportPhone}`,
    `📧 ${BRAND.supportEmail}`,
    ``,
    `Merci de faire confiance à ${BRAND.name} 🚌`,
  ].join("\n");
}

// ============================================
// Field Onboarding — DRIVER / CONTROLLER
// ============================================

/**
 * Generate WhatsApp onboarding message for terrain/PWA staff (DRIVER, CONTROLLER).
 *
 * @param staff - Staff member info (name, phone, role)
 * @param pin - 4-digit PIN for terrain login
 * @param baseUrl - Application base URL
 * @returns Formatted WhatsApp message string
 */
export function getFieldOnboardingMessage(
  staff: { name: string; phone: string; role: string },
  pin: string,
  baseUrl: string
): string {
  const roleLabel =
    staff.role === "DRIVER"
      ? "🚛 Chauffeur"
      : "🎫 Contrôleur";

  return [
    `👋 *Bienvenue chez ${BRAND.name.toUpperCase()} !*`,
    ``,
    `Bonjour ${staff.name}, votre compte terrain a été activé.`,
    `${roleLabel}`,
    ``,
    `📱 *Connexion terrain (PWA) :*`,
    `🌐 ${baseUrl}`,
    ``,
    `🔑 *Vos identifiants :*`,
    `📞 Téléphone : ${staff.phone}`,
    `🔢 Code PIN : *${pin}*`,
    ``,
    `📋 *Instructions :*`,
    `1️⃣ Ouvrez l'application sur votre téléphone`,
    `2️⃣ Entrez votre numéro de téléphone`,
    `3️⃣ Saisissez votre code PIN à 4 chiffres`,
    `4️⃣ Vous êtes connecté !`,
    ``,
    `⚠️ *Important :*`,
    `• Ce PIN expire après 30 jours sans utilisation`,
    `• Chaque connexion prolonge automatiquement la validité`,
    `• Contactez votre administrateur si le PIN est expiré`,
    ``,
    `📞 Support : ${BRAND.supportPhone}`,
    `📧 ${BRAND.supportEmail}`,
    ``,
    `Bonne route avec ${BRAND.name} ! 🚌`,
  ].join("\n");
}
