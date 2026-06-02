// @ts-nocheck
/**
 * Shared Zod validation schemas for all auth endpoints.
 * Every API route MUST use these schemas before processing.
 */

import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email requis')
    .max(254, 'Email trop long')
    .email('Format email invalide')
    .toLowerCase()
    .transform(v => v.trim()),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Mot de passe trop long'),
  role: z.enum(['admin', 'agency', 'superadmin']).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Email-only (forgot-password, resend-verification) ────────────
export const emailOnlySchema = z.object({
  email: z.string()
    .min(1, 'Email requis')
    .max(254)
    .email('Format email invalide')
    .toLowerCase()
    .transform(v => v.trim()),
});

export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;

// ─── Verify Email ──────────────────────────────────────────────────
export const verifyEmailSchema = z.object({
  token: z.string().min(10).optional(),
  code: z.string().length(6, 'Le code doit contenir 6 chiffres').regex(/^\d{6}$/, 'Format code invalide').optional(),
  email: z.string().email('Format email invalide').toLowerCase().optional(),
}).refine(
  (data) => (data.token && !data.code && !data.email) || (!data.token && data.code && data.email),
  { message: 'Fournissez un token OU un code + email', path: ['token'] }
);

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ─── Reset Password ───────────────────────────────────────────────
export const resetPasswordSchema = z.object({
  token: z.string().min(10).optional(),
  code: z.string().length(6).regex(/^\d{6}$/).optional(),
  email: z.string().email().toLowerCase().optional(),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),
}).refine(
  (data) => (data.token && !data.code && !data.email) || (!data.token && data.code && data.email),
  { message: 'Fournissez un token OU un code + email', path: ['token'] }
);

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Staff Login ──────────────────────────────────────────────────
export const staffLoginSchema = z.object({
  phone: z.string()
    .min(1, 'Téléphone requis')
    .regex(/^\+?\d{10,15}$/, 'Format téléphone invalide'),
  code: z.string()
    .length(4, 'Le code doit contenir 4 chiffres')
    .regex(/^\d{4}$/, 'Format code invalide'),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

// ─── Ticket Reservation (atomic) ────────────────────────────────────
export const reserveTicketSchema = z.object({
  departureId: z.string().min(1, 'Départ requis'),
  passengerName: z.string()
    .min(2, 'Nom du passager requis')
    .max(100, 'Nom trop long')
    .transform(v => v.trim()),
  passengerPhone: z.string()
    .min(9, 'Téléphone invalide')
    .max(15, 'Téléphone trop long')
    .regex(/^\+?\d{9,15}$/, 'Format téléphone invalide'),
  passengerAge: z.number()
    .int('Âge doit être un entier')
    .min(0, 'Âge invalide')
    .max(120, 'Âge invalide'),
  documentType: z.enum(['CNI', 'PASSEPORT', 'PERMIS_CONDUIRE', 'CARTE_CONSULAIRE', 'ATTESTATION'], {
    errorMap: () => ({ message: 'Type de document invalide' }),
  }),
  documentNumber: z.string()
    .min(4, 'Numéro de document requis')
    .max(50, 'Numéro de document trop long')
    .transform(v => v.trim().toUpperCase()),
  seatNumber: z.string()
    .min(1, 'Numéro de siège requis')
    .max(10, 'Numéro de siège invalide')
    .transform(v => v.trim()),
  luggageCount: z.number().int().min(0).max(5).default(1),
  luggageWeightKg: z.number().min(0).max(100).default(0),
  luggageFee: z.number().int().min(0).default(0),
  hasParentalAuth: z.boolean().default(false),
  platform: z.string().max(10).optional(),
});

export type ReserveTicketInput = z.infer<typeof reserveTicketSchema>;

// ─── HMAC Token Validation ────────────────────────────────────────
export const validateHmacSchema = z.object({
  token: z.string()
    .min(20, 'Token invalide (trop court)')
    .max(2048, 'Token invalide (trop long)'),
});

export type ValidateHmacInput = z.infer<typeof validateHmacSchema>;

// ─── Alert Evaluation ──────────────────────────────────────────────
export const evaluateAlertSchema = z.object({
  eventType: z.string().min(1, 'eventType requis'),
  agencyId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type EvaluateAlertInput = z.infer<typeof evaluateAlertSchema>;

// ─── Notification Dispatch ─────────────────────────────────────────
export const dispatchNotificationSchema = z.object({
  type: z.enum(['departure_sender', 'departure_receiver', 'arrival_sender', 'arrival_receiver', 'alert', 'system']),
  recipientPhone: z.string().min(9).max(15),
  recipientName: z.string().max(100).optional(),
  baggageId: z.string().optional(),
  reference: z.string().optional(),
  message: z.string().max(2000).optional(),
});

export type DispatchNotificationInput = z.infer<typeof dispatchNotificationSchema>;

// ─── Helper: Parse and validate request body ─────────────────────
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string; details?: Record<string, string[]> } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const flat = result.error.flatten();
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(flat.fieldErrors)) {
      const messages = (val as unknown as string[]) ?? [];
      fieldErrors[key] = messages.map(v => String(v));
    }
    return {
      success: false,
      error: 'Données invalides',
      details: fieldErrors,
    };
  }
  return { success: true, data: result.data };
}
