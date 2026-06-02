import { db } from "./db";
import { buildWhatsAppLink } from "./whatsapp";
import { securePinCode, generateUniqueCode } from "./codes";

// ============================================
// Parcel Control Code Generator (6-8 digits) — SECURE
// Uses crypto.randomInt() via codes.ts
// ============================================
export async function generateParcelControlCode(): Promise<string> {
  const { secureControlCode } = await import("./codes");
  return generateUniqueCode(
    () => secureControlCode(),
    async (code) => {
      const exists = await db.parcel.findUnique({ where: { controlCode: code } });
      return !!exists;
    }
  );
}

// ============================================
// Parcel PIN Code Generator (4 digits) — SECURE
// Uses crypto.randomInt() via codes.ts
// ============================================
export async function generateParcelPinCode(): Promise<string> {
  return generateUniqueCode(
    () => securePinCode(),
    async (code) => {
      const exists = await db.parcel.findUnique({ where: { pinCode: code } });
      return !!exists;
    }
  );
}

// ============================================
// Senegal Phone Formatter
// ============================================
export function formatSenegalPhone(phone: string): string {
  const cleaned = phone.replace(/[\s+\-()]/g, "");

  // Already has country code
  if (cleaned.startsWith("221")) {
    return cleaned;
  }

  // Starts with 0 (local format)
  if (cleaned.startsWith("0")) {
    return "221" + cleaned.slice(1);
  }

  // 9-digit number without prefix
  if (/^[7-9]\d{8}$/.test(cleaned)) {
    return "221" + cleaned;
  }

  // Fallback: return cleaned
  return cleaned;
}

// ============================================
// WhatsApp Message Builder for Parcels
// ============================================
interface ParcelWhatsAppData {
  controlCode: string;
  pinCode?: string;
  senderName: string;
  recipientName: string;
  recipientLocation: string;
  fromStationName: string;
  toStationName: string;
  price: number;
  luggageCount: number;
  estimatedArrival?: Date | null;
}

type ParcelWhatsAppType = "sender" | "recipient" | "sender_delivered" | "recipient_delivered";

function buildParcelSenderMessage(parcel: ParcelWhatsAppData): string {
  const arrival = parcel.estimatedArrival
    ? `📅 Arrivée estimée : ${parcel.estimatedArrival.toLocaleDateString("fr-FR")} ${parcel.estimatedArrival.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return [
    `📦 *COLIS ENREGISTRÉ* — SmartTickets`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔢 *Code suivi : ${parcel.controlCode}*`,
    `👤 Expéditeur : ${parcel.senderName}`,
    `👤 Destinataire : ${parcel.recipientName}`,
    `📍 Lieu de livraison : ${parcel.recipientLocation}`,
    `🛤️ Trajet : ${parcel.fromStationName} → ${parcel.toStationName}`,
    `📦 Nombre de colis : ${parcel.luggageCount}`,
    `💰 Montant : ${parcel.price.toLocaleString("fr-FR")} FCFA`,
    `${arrival}`,
    ``,
    `🚚 Votre colis est *en transit*.`,
    ``,
    `Merci de faire confiance à SmartTickets ! 🙏`,
  ].join("\n");
}

function buildParcelRecipientMessage(parcel: ParcelWhatsAppData): string {
  const arrival = parcel.estimatedArrival
    ? `📅 Arrivée estimée : ${parcel.estimatedArrival.toLocaleDateString("fr-FR")} ${parcel.estimatedArrival.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return [
    `📦 *COLIS EN TRANSIT* — SmartTickets`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔢 *Code suivi : ${parcel.controlCode}*`,
    `🔑 *Code PIN de retrait : ${parcel.pinCode}*`,
    ``,
    `⚠️ *Gardez ce code secret !* Vous devrez le présenter pour retirer votre colis.`,
    ``,
    `👤 Expéditeur : ${parcel.senderName}`,
    `📍 Lieu de livraison : ${parcel.recipientLocation}`,
    `🛤️ Trajet : ${parcel.fromStationName} → ${parcel.toStationName}`,
    `📦 Nombre de colis : ${parcel.luggageCount}`,
    `${arrival}`,
    ``,
    `🚚 Votre colis est *en route*. Présentez votre code PIN au livreur.`,
    ``,
    `Merci de faire confiance à SmartTickets ! 🙏`,
  ].join("\n");
}

function buildParcelSenderDeliveredMessage(parcel: ParcelWhatsAppData): string {
  return [
    `✅ *COLIS LIVRÉ* — SmartTickets`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔢 Code suivi : ${parcel.controlCode}`,
    `👤 Destinataire : ${parcel.recipientName}`,
    `📍 Lieu de livraison : ${parcel.recipientLocation}`,
    `🛤️ Trajet : ${parcel.fromStationName} → ${parcel.toStationName}`,
    ``,
    `✅ Votre colis a été livré avec succès.`,
    ``,
    `Merci de faire confiance à SmartTickets ! 🙏`,
  ].join("\n");
}

function buildParcelRecipientDeliveredMessage(parcel: ParcelWhatsAppData): string {
  return [
    `✅ *COLIS RETIRÉ* — SmartTickets`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔢 Code suivi : ${parcel.controlCode}`,
    `📍 Lieu de livraison : ${parcel.recipientLocation}`,
    `🛤️ Trajet : ${parcel.fromStationName} → ${parcel.toStationName}`,
    ``,
    `✅ Votre colis a été retiré avec succès.`,
    ``,
    `Merci de faire confiance à SmartTickets ! 🙏`,
  ].join("\n");
}

interface ParcelWhatsAppResult {
  senderLink: string | null;
  recipientLink: string | null;
  senderMessage: string | null;
  recipientMessage: string | null;
}

export function buildParcelWhatsAppLinks(
  parcel: ParcelWhatsAppData,
  type: ParcelWhatsAppType
): ParcelWhatsAppResult {
  switch (type) {
    case "sender": {
      const message = buildParcelSenderMessage(parcel);
      return {
        senderLink: null,
        recipientLink: null,
        senderMessage: message,
        recipientMessage: null,
      };
    }
    case "recipient": {
      const message = buildParcelRecipientMessage(parcel);
      return {
        senderLink: null,
        recipientLink: null,
        senderMessage: null,
        recipientMessage: message,
      };
    }
    case "sender_delivered": {
      const message = buildParcelSenderDeliveredMessage(parcel);
      return {
        senderLink: null,
        recipientLink: null,
        senderMessage: message,
        recipientMessage: null,
      };
    }
    case "recipient_delivered": {
      const message = buildParcelRecipientDeliveredMessage(parcel);
      return {
        senderLink: null,
        recipientLink: null,
        senderMessage: null,
        recipientMessage: message,
      };
    }
  }
}

// Convenience: build both activation links at once
export function buildParcelActivationLinks(
  parcel: ParcelWhatsAppData,
  senderPhone: string,
  recipientPhone: string
): {
  whatsappSenderLink: string;
  whatsappRecipientLink: string;
  whatsappSenderMessage: string;
  whatsappRecipientMessage: string;
} {
  const senderResult = buildParcelWhatsAppLinks(parcel, "sender");
  const recipientResult = buildParcelWhatsAppLinks(parcel, "recipient");

  return {
    whatsappSenderLink: buildWhatsAppLink(senderPhone, senderResult.senderMessage!),
    whatsappRecipientLink: buildWhatsAppLink(recipientPhone, recipientResult.recipientMessage!),
    whatsappSenderMessage: senderResult.senderMessage!,
    whatsappRecipientMessage: recipientResult.recipientMessage!,
  };
}

// Convenience: build both delivery links at once
export function buildParcelDeliveryLinks(
  parcel: ParcelWhatsAppData,
  senderPhone: string,
  recipientPhone: string
): {
  whatsappSenderLink: string;
  whatsappRecipientLink: string;
  whatsappSenderMessage: string;
  whatsappRecipientMessage: string;
} {
  const senderResult = buildParcelWhatsAppLinks(parcel, "sender_delivered");
  const recipientResult = buildParcelWhatsAppLinks(parcel, "recipient_delivered");

  return {
    whatsappSenderLink: buildWhatsAppLink(senderPhone, senderResult.senderMessage!),
    whatsappRecipientLink: buildWhatsAppLink(recipientPhone, recipientResult.recipientMessage!),
    whatsappSenderMessage: senderResult.senderMessage!,
    whatsappRecipientMessage: recipientResult.recipientMessage!,
  };
}
