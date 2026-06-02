import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateReference, generateSetId, calculateExpirationDate } from '@/lib/qr';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// Schema for individual generation
const individualSchema = z.object({
  context: z.literal('individual'),
  type: z.enum(['hajj', 'voyageur']),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  whatsapp: z.string().min(6).max(20),
  duration: z.enum(['7d', '1y']),
  baggageCount: z.number().min(1).max(3),
});

// Schema for agency generation (traveler-based)
const agencySchema = z.object({
  context: z.literal('agency'),
  type: z.enum(['hajj', 'voyageur']),
  agencyId: z.string().min(1),
  count: z.number().min(1).max(3),
  travelerCount: z.number().min(1).max(1000),
});

// Schema for bulk generation (direct QR count)
const bulkSchema = z.object({
  context: z.literal('bulk'),
  type: z.enum(['hajj', 'voyageur']),
  agencyId: z.string().optional().default(''),
  totalQrCount: z.number().min(1).max(2000),
});

// Combined schema using discriminated union
const combinedSchema = z.discriminatedUnion('context', [
  individualSchema,
  agencySchema,
  bulkSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(currentUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = combinedSchema.parse(body);

    if (validatedData.context === 'individual') {
      // Generate for individual traveler
      const references = await generateBaggagesWithTraveler({
        type: validatedData.type,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        whatsapp: validatedData.whatsapp,
        duration: validatedData.duration,
        baggageCount: validatedData.baggageCount as 1 | 3,
      });

      return NextResponse.json({
        success: true,
        generated: references.length,
        references
      });
    } else if (validatedData.context === 'agency') {
      // Generate for agency (traveler-based)
      const allReferences: string[] = [];

      for (let i = 0; i < validatedData.travelerCount; i++) {
        const references = await generateBaggages({
          type: validatedData.type,
          agencyId: validatedData.agencyId,
          count: validatedData.type === 'hajj' ? 3 : validatedData.count as 1 | 3
        });
        allReferences.push(...references);
      }

      return NextResponse.json({
        success: true,
        generated: allReferences.length,
        references: allReferences
      });
    } else {
      // Bulk generation — direct QR count, all in one set
      const result = await generateBulkBaggages({
        type: validatedData.type,
        agencyId: validatedData.agencyId || undefined,
        totalQrCount: validatedData.totalQrCount,
      });

      return NextResponse.json({
        success: true,
        generated: result.generated,
        setId: result.setId,
        references: result.references,
      });
    }
  } catch (error) {
    console.error('Generate QR error:', error);

    // Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as z.ZodError;
      return NextResponse.json(
        { error: 'Validation error', details: zodError.issues },
        { status: 400 }
      );
    }

    // Return actual error details for debugging
    const message = error instanceof Error ? error.message : String(error);

    // Known business errors → 400
    if (message.includes('Agence introuvable') || message.includes('not found')) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    // Prisma foreign key / unique constraint errors
    if (message.includes('Foreign key constraint') || message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Erreur de base de données: ' + message.split('\n')[0] },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

/**
 * Generate baggages for individual traveler with traveler info
 */
async function generateBaggagesWithTraveler(options: {
  type: 'hajj' | 'voyageur';
  firstName: string;
  lastName: string;
  whatsapp: string;
  duration: '7d' | '1y';
  baggageCount: 1 | 3;
}): Promise<string[]> {
  const { type, firstName, lastName, whatsapp, duration, baggageCount } = options;
  const references: string[] = [];

  // Generate a unique set ID for this batch
  const setId = generateSetId(type);

  for (let i = 0; i < baggageCount; i++) {
    const reference = await generateReference(type);
    const expiresAt = calculateExpirationDate(type, duration === '1y' ? 'tag' : 'sticker');

    await db.baggage.create({
      data: {
        reference,
        type,
        setId,
        agencyId: null,
        travelerFirstName: firstName,
        travelerLastName: lastName,
        whatsappOwner: whatsapp,
        baggageIndex: i + 1,
        baggageType: i === 0 ? 'cabine' : 'soute',
        status: 'active', // Already active for individual
        expiresAt,
      }
    });

    references.push(reference);
  }

  return references;
}

/**
 * Generate baggages for agency (no traveler info, needs activation)
 */
async function generateBaggages(options: {
  type: 'hajj' | 'voyageur';
  agencyId?: string;
  count: 1 | 3;
}): Promise<string[]> {
  const { type, agencyId, count } = options;
  const references: string[] = [];

  // Validate agency exists if agencyId is provided
  if (agencyId) {
    const agency = await db.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      throw new Error(`Agence introuvable (ID: ${agencyId})`);
    }
  }

  // Generate a unique set ID for this batch
  const setId = generateSetId(type);

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
        status: 'pending_activation', // Needs activation by agency
      }
    });

    references.push(reference);
  }

  return references;
}

/**
 * Generate a large batch of baggages — all in one set, no traveler info.
 * Optimized for bulk (200+ QR codes in one operation).
 */
async function generateBulkBaggages(options: {
  type: 'hajj' | 'voyageur';
  agencyId?: string;
  totalQrCount: number;
}): Promise<{ generated: number; setId: string; references: string[] }> {
  const { type, agencyId, totalQrCount } = options;

  // Validate agency exists if agencyId is provided
  if (agencyId) {
    const agency = await db.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      throw new Error(`Agence introuvable (ID: ${agencyId})`);
    }
  }

  // One unique set ID for the entire batch
  const setId = generateSetId(type);
  const references: string[] = [];

  // Generate all unique references
  for (let i = 0; i < totalQrCount; i++) {
    const reference = await generateReference(type);
    references.push(reference);
  }

  // Insert one by one to avoid SQLite createMany limitations
  // (no skipDuplicates support, default values not applied, variable limit)
  for (let i = 0; i < references.length; i++) {
    await db.baggage.create({
      data: {
        reference: references[i],
        type,
        setId,
        agencyId: agencyId || null,
        baggageIndex: i + 1,
        baggageType: 'cabine',
        status: 'pending_activation',
        transportMode: 'flight',
        paymentStatus: 'SENDER_PAID',
      }
    });
  }

  return { generated: references.length, setId, references };
}

// GET - Get all baggages (for QR codes list)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(currentUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '500');

    const where: Record<string, unknown> = {};

    if (agencyId) {
      where.agencyId = agencyId;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const baggages = await db.baggage.findMany({
      where,
      include: { agency: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ baggages });
  } catch (error) {
    console.error('Get baggages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
