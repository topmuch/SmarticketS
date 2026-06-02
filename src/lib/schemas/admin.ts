/**
 * SmartTicketQR — Admin Route Zod Schemas
 *
 * Strict validation for all admin endpoints.
 * Replaces inline schema definitions scattered across routes.
 */

import { z } from "zod";

// ============================================
// Staff Management
// ============================================

export const createStaffSchema = z
  .object({
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").optional().or(z.literal("")),
    pin: z
      .string()
      .regex(/^\d{4,6}$/, "Le PIN doit contenir entre 4 et 6 chiffres")
      .optional()
      .or(z.literal("")),
    role: z.enum(["ADMIN", "OPERATOR", "CONTROLLER", "DRIVER"], {
      message: "Rôle invalide",
    }),
    firstName: z.string().min(1, "Le prénom est requis"),
    lastName: z.string().min(1, "Le nom est requis"),
    phone: z.string().optional(),
  })
  .refine(
    (data) => {
      // ADMIN/OPERATOR must have email + password
      if (data.role === "ADMIN" || data.role === "OPERATOR") {
        return !!data.email && data.email !== "" && !!data.password && data.password !== "";
      }
      // CONTROLLER/DRIVER must have phone + pin
      if (data.role === "CONTROLLER" || data.role === "DRIVER") {
        return !!data.phone && !!data.pin && data.pin !== "";
      }
      return true;
    },
    {
      message:
        "ADMIN/OPERATOR doivent avoir un email + mot de passe. CONTROLLER/DRIVER doivent avoir un téléphone + PIN.",
      path: ["role"],
    }
  );

export const updateStaffSchema = z.object({
  role: z.enum(["OPERATOR", "CONTROLLER", "DRIVER"]).optional(),
  isActive: z.boolean().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
});

// ============================================
// Tenant Settings
// ============================================

export const updateTenantSettingsSchema = z.object({
  currency: z.string().min(1).max(10).optional(),
  language: z.string().min(2).max(5).optional(),
  timezone: z.string().max(50).optional(),
  ticketPrefix: z.string().max(10).optional(),
  parcelPrefix: z.string().max(10).optional(),
  autoWhatsApp: z.boolean().optional(),
  whatsappTemplate: z.string().max(5000).optional(),
  emailNotifications: z.boolean().optional(),
  emailSmtpHost: z.string().max(255).optional(),
  emailSmtpPort: z.number().int().min(1).max(65535).optional(),
  emailSmtpUser: z.string().max(255).optional(),
  emailSmtpPass: z.string().max(255).optional(),
  emailFromName: z.string().max(255).optional(),
  emailFromAddress: z.string().email().optional().or(z.literal("")),
  maxLuggageWeight: z.number().int().min(0).max(100).optional(),
  luggageFeePerKg: z.number().int().min(0).max(10000).optional(),
  childDiscountPercent: z.number().int().min(0).max(100).optional(),
  receiptFooter: z.string().max(500).optional(),
});

// ============================================
// Notifications
// ============================================

export const testNotificationSchema = z.object({
  type: z.enum(["email", "whatsapp"]),
  recipient: z.string().min(1, "Le destinataire est requis"),
  template: z.enum([
    "ticket",
    "parcel_sender",
    "parcel_recipient",
    "delivery_confirmed",
  ]),
});
