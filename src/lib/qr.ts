import { db } from './db';
import { randomInt } from 'crypto';

// Generate random alphanumeric string (cryptographically secure)
export function generateRandomCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(0, chars.length));
  }
  return result;
}

/**
 * Generate unique control code for ticket validation (6-8 digits).
 *
 * FIX (audit #3): previously used Math.random() which is NOT cryptographically
 * secure — brute-forceable for ticket validation. Now uses crypto.randomInt()
 * which is CSPRNG (cryptographically secure pseudo-random number generator).
 */
export async function generateControlCode(length: number = 6): Promise<string> {
  let code = '';
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const min = 10 ** length;
    const max = 10 ** (length + 1);
    // FIX (audit #3): crypto.randomInt instead of Math.random
    code = String(randomInt(min, max));

    const existing = await db.passengerTicket.findUnique({
      where: { controlCode: code },
    });

    if (!existing) {
      return code;
    }
    attempts++;
  }

  throw new Error('Failed to generate unique control code after ' + maxAttempts + ' attempts');
}

// Generate unique reference
export async function generateReference(type: 'hajj' | 'voyageur'): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = type === 'hajj' ? 'HAJJ' : 'VOL';
  
  let reference = '';
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    reference = `${prefix}${year}-${generateRandomCode(6)}`;
    
    const existing = await db.baggage.findUnique({
      where: { reference }
    });
    
    if (!existing) {
      return reference;
    }
    attempts++;
  }
  
  throw new Error('Failed to generate unique reference');
}

// Generate multiple baggages for a traveler
export interface GenerateBaggageOptions {
  type: 'hajj' | 'voyageur';
  agencyId?: string;
  count: 1 | 3;
}

// Generate baggage with individual traveler info
export interface GenerateIndividualOptions {
  type: 'hajj' | 'voyageur';
  firstName: string;
  lastName: string;
  whatsapp: string;
  duration: '7d' | '1y';
  baggageCount: 1 | 3;
}

// Generate unique set ID
export function generateSetId(type: 'hajj' | 'voyageur'): string {
  const year = new Date().getFullYear();
  const prefix = type === 'hajj' ? 'HAJJ' : 'VOL';
  const random = generateRandomCode(4);
  return `${prefix}-${year}-${random}`;
}

export async function generateBaggages(options: GenerateBaggageOptions): Promise<string[]> {
  const { type, agencyId, count } = options;
  const references: string[] = [];

  // Generate a unique set ID for this batch
  const setId = generateSetId(type);

  // For Hajj, always 3 bags (1 cabine + 2 soutes)
  // For Voyageur, user choice (1 or 3)

  for (let i = 0; i < count; i++) {
    const reference = await generateReference(type);

    await db.baggage.create({
      data: {
        reference,
        type,
        setId,
        agencyId: agencyId || null,
        baggageIndex: i + 1,
        baggageType: i === 0 ? 'cabine' : 'soute',
        status: 'pending_activation',
      }
    });

    references.push(reference);
  }

  return references;
}

// Calculate expiration date based on type
export function calculateExpirationDate(type: 'hajj' | 'voyageur', subtype?: 'sticker' | 'tag'): Date {
  const now = new Date();
  
  switch (type) {
    case 'hajj':
      return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // +60 days
    case 'voyageur':
      if (subtype === 'tag') {
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // +365 days
      }
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days (sticker) - changed from 72h
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
  }
}

// Validate reference format
export function isValidReferenceFormat(reference: string): boolean {
  const hajjPattern = /^HAJJ\d{2}-[A-Z0-9]{6}$/;
  const volPattern = /^VOL\d{2}-[A-Z0-9]{6}$/;
  return hajjPattern.test(reference) || volPattern.test(reference);
}

// Get baggage status info
export function getBaggageStatusInfo(status: string) {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    pending_activation: {
      label: 'En attente d\'activation',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    active: {
      label: 'Actif',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    scanned: {
      label: 'Scanné',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    lost: {
      label: 'Perdu',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    found: {
      label: 'Retrouvé',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    blocked: {
      label: 'Bloqué',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  };
  
  return statusMap[status] || {
    label: status,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  };
}
