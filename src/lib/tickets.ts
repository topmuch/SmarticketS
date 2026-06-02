import { db } from "./db";
import crypto from "crypto";
import {
  secureControlCode,
  secureQrHash,
  generateUniqueCode,
} from "./codes";
import { buildWhatsAppLink } from "./whatsapp";
import { BRAND } from "./constants";

// ============================================
// Baggage Fee Calculation
// ============================================
// Uses centralized pricing constants from BRAND.
export function calculateLuggageFee(weightKg: number): number {
  const excess = Math.ceil(weightKg - BRAND.pricing.freeLuggageKg);
  return Math.max(0, excess) * BRAND.pricing.excessWeightFeePerKg;
}

// ============================================
// Control Code Generator (6-8 digits) — SECURE
// Uses crypto.randomInt() via codes.ts
// ============================================
export async function generateControlCode(): Promise<string> {
  return generateUniqueCode(
    () => secureControlCode(),
    async (code) => {
      const exists = await db.passengerTicket.findUnique({
        where: { controlCode: code },
      });
      return !!exists;
    }
  );
}

// ============================================
// QR Hash Generator — SECURE
// Uses crypto.randomBytes() via codes.ts
// ============================================
export function generateQrHash(): string {
  return secureQrHash();
}

// ============================================
// Ticket Code Generator (TKT-0001)
// ============================================
export function generateTicketCode(index: number): string {
  return `TKT-${index.toString().padStart(4, "0")}`;
}

// ============================================
// Batch ID Generator
// ============================================
export function generateBatchId(): string {
  return crypto.randomUUID();
}

// ============================================
// WhatsApp Message Builder
// ============================================
interface WhatsAppTicketData {
  passengerName: string;
  lineName?: string | null;
  seatNumber?: string | null;
  luggageCount: number;
  luggageWeight: number;
  luggageFee: number;
  ticketPrice: number;
  totalPrice: number;
  controlCode: string;
  isChild: boolean;
}

export function buildWhatsAppMessage(
  ticket: WhatsAppTicketData,
  ticketCode: string
): string {
  const line = ticket.lineName || "Non défini";
  const seat = ticket.seatNumber || "Non attribué";
  const childTag = ticket.isChild ? " ⭐ MINEUR" : "";

  return [
    `\ud83d\ude8c *${BRAND.name.toUpperCase()}* \u2014 Confirmation de Billet`,
    ``,
    `📋 *Détails du billet*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🎫 Code billet : ${ticketCode}`,
    `👤 Passager : ${ticket.passengerName}${childTag}`,
    `🛤️ Ligne : ${line}`,
    `💺 Siège : ${seat}`,
    ``,
    `📦 Bagages : ${ticket.luggageCount} bagage(s) — ${ticket.luggageWeight} kg`,
    `💰 Prix billet : ${ticket.ticketPrice.toLocaleString("fr-FR")} FCFA`,
    `💰 Frais bagages : ${ticket.luggageFee.toLocaleString("fr-FR")} FCFA`,
    `🔢 *Contrôle : ${ticket.controlCode}*`,
    `💵 *TOTAL : ${ticket.totalPrice.toLocaleString("fr-FR")} FCFA*`,
    ``,
    `⚠️ *Conditions*`,
    `• Présentez ce code de contrôle à l'embarquement`,
    `• Le report n'est possible que 24h avant le départ (1 seule fois)`,
    `• Les billets ne sont pas remboursables`,
    `• Les mineurs de moins de 5 ans voyagent gratuitement sur les genoux`,
    ``,
    `Merci de voyager avec ${BRAND.name} ! 🚌`,
  ].join("\n");
}

// ============================================
// WhatsApp Link Builder — delegates to unified module
// ============================================
export { buildWhatsAppLink };

// ============================================
// Child Validation
// ============================================
export function validateChildRules(
  passengerAge: number,
  isChild: boolean,
  childDocument: string | null | undefined
): string | null {
  if (!isChild) return null;
  if (!childDocument || childDocument.trim().length === 0) {
    return "Le document du mineur (extrait de naissance ou autorisation parentale) est obligatoire.";
  }
  return null;
}

// ============================================
// Reschedule Validation
// ============================================
export function validateReschedule(
  departureTime: Date | null,
  rescheduleCount: number
): string | null {
  if (rescheduleCount >= 1) {
    return "Ce billet a déjà été reporté une fois.";
  }
  if (!departureTime) {
    return "Aucune heure de départ associée à ce billet.";
  }
  const now = new Date();
  const hoursUntilDeparture =
    (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDeparture < 24) {
    return "Le report n'est possible que 24h avant le départ.";
  }
  return null;
}
