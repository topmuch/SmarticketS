/**
 * SmartTicketQR — QR Stock Zod Schemas
 *
 * Validation schemas for the "QR Vierge vs Ticket Actif" module.
 * Covers batch generation (superadmin) and ticket activation (transporteur).
 */

import { z } from "zod";

// Superadmin: Generate QR batch for a specific tenant
export const generateQrBatchSchema = z.object({
  tenantId: z.string().min(1, "L'ID du transporteur est requis"),
  quantity: z
    .number()
    .int()
    .min(1, "Minimum 1 QR")
    .max(500, "Maximum 500 QR par lot"),
  startFrom: z
    .number()
    .int()
    .min(1, "Le numéro de départ doit être positif"),
});

// Transporteur: Activate a QR (link to departure + passenger)
export const activateQrTicketSchema = z.object({
  ticketCode: z.string().min(1, "Le code ticket est requis"),
  departureId: z.string().min(1, "L'ID du trajet est requis"),
  passengerName: z
    .string()
    .min(1, "Le nom du passager est requis")
    .max(100),
  passengerAge: z
    .number()
    .int()
    .min(0, "L'âge doit être positif")
    .max(120),
  passengerPhone: z
    .string()
    .min(8, "Le téléphone est requis")
    .max(20),
  seatNumber: z.string().optional(),
  luggageCount: z.number().int().min(0).max(10).default(1),
  isChild: z.boolean().default(false),
});
