/**
 * Status Normalization — Central helper
 *
 * La DB peut contenir des statuts en français (EN_ATTENTE, ACTIF)
 * ou en anglais (pending_activation, active).
 *
 * Ce module fournit une normalisation centralisée utilisée partout.
 *
 * Format standard (english) : pending_activation | active | scanned | lost | found | blocked | expired
 */

// ═══════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════

/** All possible standard statuses */
export type BaggageStatus =
  | 'pending_activation'
  | 'active'
  | 'scanned'
  | 'lost'
  | 'found'
  | 'blocked'
  | 'expired';

// ═══════════════════════════════════════════════════════
//  ALIASES
// ═══════════════════════════════════════════════════════

const STATUS_ALIASES: Record<string, BaggageStatus> = {
  // French → English
  EN_ATTENTE: 'pending_activation',
  ACTIF: 'active',
  SCANNÉ: 'scanned',
  PERDU: 'lost',
  TROUVÉ: 'found',
  BLOQUÉ: 'blocked',
  EXPIRÉ: 'expired',
  // Lowercase French
  en_attente: 'pending_activation',
  actif: 'active',
  scanné: 'scanned',
  perdu: 'lost',
  trouvé: 'found',
  bloqué: 'blocked',
  expiré: 'expired',
};

// ═══════════════════════════════════════════════════════
//  NORMALIZE
// ═══════════════════════════════════════════════════════

/**
 * Normalize any status string to standard English format.
 * Returns 'pending_activation' as safe default for null/undefined.
 */
export function normalizeStatus(status: string | null | undefined): BaggageStatus {
  if (!status) return 'pending_activation';
  return STATUS_ALIASES[status] || (status as BaggageStatus);
}

/**
 * Check if status is "pending" (any variant).
 */
export function isPending(status: string | null | undefined): boolean {
  return normalizeStatus(status) === 'pending_activation';
}

/**
 * Check if status is "active" (any variant).
 */
export function isActive(status: string | null | undefined): boolean {
  const s = normalizeStatus(status);
  return s === 'active' || s === 'scanned';
}

/**
 * Check if status is "scanned" (any variant).
 */
export function isScanned(status: string | null | undefined): boolean {
  return normalizeStatus(status) === 'scanned';
}

/**
 * Check if status is "lost" (any variant).
 */
export function isLost(status: string | null | undefined): boolean {
  return normalizeStatus(status) === 'lost';
}

/**
 * Check if status is "found" (any variant).
 */
export function isFound(status: string | null | undefined): boolean {
  return normalizeStatus(status) === 'found';
}

/**
 * Build a Prisma `{ in: [...] }` filter for a given standard status
 * that matches BOTH French and English variants in DB.
 */
export function statusFilterIn(standardStatus: BaggageStatus): { in: string[] } {
  const aliases = Object.entries(STATUS_ALIASES)
    .filter(([, eng]) => eng === standardStatus)
    .map(([fr]) => fr);
  return { in: [standardStatus, ...aliases] };
}

/**
 * Build a Prisma `{ in: [...] }` filter for multiple standard statuses.
 */
export function statusFilterInMany(standardStatuses: BaggageStatus[]): { in: string[] } {
  const all: string[] = [];
  for (const s of standardStatuses) {
    const f = statusFilterIn(s);
    all.push(...f.in);
  }
  return { in: [...new Set(all)] };
}
