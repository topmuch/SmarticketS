/**
 * SmartTicketQR — Centralized Brand Constants
 *
 * Single source of truth for branding, contact info, and configuration.
 * Replace ALL hardcoded brand names, phone numbers, emails, and URLs
 * throughout the codebase with these constants.
 */

export const BRAND = {
  name: "SmartTicketQR",
  shortName: "STQR",
  tagline: "Billetterie & Suivi Colis Transport",
  description:
    "Solution SaaS multi-transporteurs : vente de tickets QR, gestion colis securisee, affichage gare temps reel, PWA controleur offline.",

  // Contact information (from environment or defaults)
  supportPhone:
    process.env.NEXT_PUBLIC_SUPPORT_PHONE || "221766988585",
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@smartticketqr.com",
  whatsappBusiness:
    process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER || "221766988585",

  // Application URLs
  baseUrl:
    process.env.NEXT_PUBLIC_APP_URL || "https://smartticketqr.com",
  trackingUrl:
    process.env.NEXT_PUBLIC_TRACKING_URL || "https://smartticketqr.com/track",

  // Currency
  currency: "FCFA",
  currencyLocale: "fr-FR",

  // Default locale & timezone
  locale: "fr",
  timezone: "Africa/Dakar",

  // Year for copyright
  copyrightYear: new Date().getFullYear().toString(),

  // Pricing defaults (shared between frontend preview and backend calculation)
  pricing: {
    excessWeightFeePerKg: 200, // FCFA per kg over free allowance
    freeLuggageKg: 15,         // Free luggage allowance in kg
    defaultParcelPrice: 2000,  // FCFA default parcel price when no rate exists
  },

  // Company info for legal pages
  company: {
    name: "SmarticketS",
    legalForm: "SARL",
    rccm: "Dakar B-12-345-678-2024",
    ninea: "0012345678A",
    address: "Dakar, Sénégal",
    email: "contact@smartickets.com",
  },

  // Data Protection Officer (DPO) info
  dpo: {
    email: process.env.NEXT_PUBLIC_DPO_EMAIL || "dpo@smartickets.com",
  },

  // Offline sync fallback values
  offline: {
    placeholderName: "HORS-LIGNE",
    placeholderPhone: "000000000",
    defaultPassengerAge: 30,
  },
} as const;
