import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import {
  getAuthUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/auth-guard';
import { logAudit } from '@/lib/audit';
import { checkGenerationPermission } from '@/lib/generation-guard';
import { secureControlCode, securePinCode, generateUniqueCode } from '@/lib/codes';

// Default parcel price when no rate exists — from env or fallback
const DEFAULT_PARCEL_PRICE = parseInt(process.env.DEFAULT_PARCEL_PRICE || '2000', 10);

// Offline sync fallback values — centralized constants
const OFFLINE_PLACEHOLDER = 'HORS-LIGNE';
const OFFLINE_PLACEHOLDER_PHONE = '000000000';
const DEFAULT_PASSENGER_AGE = 30;

// ============================================
// PHASE 5: BATCH SYNC API ENDPOINT
// Accepts multiple actions in a single request
// Used by the sync engine when online
// ============================================

const batchItemSchema = z.object({
  type: z.enum(['ticket', 'parcel', 'deliver']),
  payload: z.record(z.string(), z.unknown()),
  clientTimestamp: z.number().optional(),
});

const batchSyncSchema = z.object({
  items: z.array(batchItemSchema).min(1).max(50),
});

// POST /api/sync/batch — Process multiple actions in a single request
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "OPERATOR", "ADMIN", "SUPER_ADMIN", "DRIVER", "CONTROLLER");

    if (!payload.tenantId) {
      return forbiddenResponse("Vous devez appartenir à une société pour synchroniser.");
    }

    const body = await request.json();
    const parsed = batchSyncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const results: Array<{
      index: number;
      type: string;
      success: boolean;
      data?: Record<string, unknown>;
      error?: string;
    }> = [];

    for (let i = 0; i < parsed.data.items.length; i++) {
      const item = parsed.data.items[i];

      try {
        // Route to the appropriate handler based on type
        let result: Record<string, unknown> | null = null;

        switch (item.type) {
          case 'ticket':
            result = await processTicketActivation(item.payload, payload.userId, payload.tenantId!, payload.role, request);
            break;
          case 'parcel':
            result = await processParcelActivation(item.payload, payload.userId, payload.tenantId!, payload.role, request);
            break;
          case 'deliver':
            result = await processParcelDelivery(item.payload, payload.userId, payload.tenantId!, request);
            break;
          default:
            results.push({
              index: i,
              type: item.type,
              success: false,
              error: `Type non supporté: ${item.type}`,
            });
            continue;
        }

        results.push({
          index: i,
          type: item.type,
          success: true,
          data: result || undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        results.push({
          index: i,
          type: item.type,
          success: false,
          error: message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // Audit
    await logAudit({
      action: "BATCH_SYNC",
      entity: "SyncQueue",
      details: {
        totalItems: parsed.data.items.length,
        successCount,
        failCount,
        types: parsed.data.items.map((i) => i.type),
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({
      processed: parsed.data.items.length,
      synced: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("access")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec de la synchronisation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================
// ACTION PROCESSORS (with guards + secure codes)
// ============================================

async function processTicketActivation(
  payload: Record<string, unknown>,
  userId: string,
  tenantId: string,
  role: string,
  _request: NextRequest
): Promise<Record<string, unknown>> {
  const { ticketCode, passengerName, passengerPhone } = payload as {
    ticketCode: string;
    passengerName?: string;
    passengerPhone?: string;
  };

  if (!ticketCode) throw new Error('ticketCode requis');

  // ✅ Guard de génération — same check as normal activation
  const genCheck = await checkGenerationPermission(
    { userId, tenantId, role: role as Role, email: '', jti: '' },
    'ticket'
  );
  if (!genCheck.allowed) {
    throw new Error('Génération de tickets désactivée pour votre société');
  }

  // Find preprinted ticket
  const preprinted = await db.preprintedTicket.findFirst({
    where: { ticketCode, tenantId, status: 'inactive' },
  });

  if (!preprinted) {
    // Idempotent: if already active, return success
    const existing = await db.preprintedTicket.findFirst({
      where: { ticketCode, tenantId },
    });
    if (existing && existing.status === 'active') {
      return { idempotent: true, ticketCode, message: 'Déjà activé' };
    }
    throw new Error('Ticket non disponible');
  }

  // Check for duplicate passenger ticket
  const existingTicket = await db.passengerTicket.findFirst({
    where: { preprintedId: preprinted.id },
  });

  if (existingTicket) {
    return { idempotent: true, ticketCode, controlCode: existingTicket.controlCode };
  }

  // ✅ Generate cryptographically secure control code
  const controlCode = await generateUniqueCode(
    () => secureControlCode(),
    async (code) => {
      const exists = await db.passengerTicket.findUnique({ where: { controlCode: code } });
      return !!exists;
    }
  );

  await db.$transaction(async (tx) => {
    await tx.preprintedTicket.update({
      where: { id: preprinted.id },
      data: { status: 'active' },
    });
    await tx.passengerTicket.create({
      data: {
        controlCode,
        passengerName: passengerName || OFFLINE_PLACEHOLDER,
        passengerAge: DEFAULT_PASSENGER_AGE,
        passengerPhone: passengerPhone || OFFLINE_PLACEHOLDER_PHONE,
        activatedById: userId,
        preprintedId: preprinted.id,
        tenantId,
      },
    });
  });

  return { success: true, ticketCode, controlCode };
}

async function processParcelActivation(
  payload: Record<string, unknown>,
  userId: string,
  tenantId: string,
  role: string,
  _request: NextRequest
): Promise<Record<string, unknown>> {
  const { ticketCode, senderName, recipientName, fromStationId, toStationId } = payload as {
    ticketCode: string;
    senderName?: string;
    recipientName?: string;
    fromStationId?: string;
    toStationId?: string;
  };

  if (!ticketCode) throw new Error('ticketCode requis');

  // ✅ Guard de génération pour colis
  const genCheck = await checkGenerationPermission(
    { userId, tenantId, role: role as Role, email: '', jti: '' },
    'parcel'
  );
  if (!genCheck.allowed) {
    throw new Error('Génération de colis désactivée pour votre société');
  }

  // Find preprinted ticket
  const preprinted = await db.preprintedTicket.findFirst({
    where: { ticketCode, tenantId, status: 'inactive', type: 'PARCEL' },
  });

  if (!preprinted) {
    const existing = await db.preprintedTicket.findFirst({
      where: { ticketCode, tenantId, type: 'PARCEL' },
    });
    if (existing && existing.status === 'active') {
      return { idempotent: true, ticketCode, message: 'Déjà activé' };
    }
    throw new Error('Ticket colis non disponible');
  }

  // Check for duplicate parcel
  const existingParcel = await db.parcel.findFirst({
    where: { ticketId: preprinted.id },
  });

  if (existingParcel) {
    return { idempotent: true, ticketCode, controlCode: existingParcel.controlCode };
  }

  // Find or create rate
  let rateId: string | undefined;
  if (fromStationId && toStationId) {
    const existingRate = await db.parcelRate.findFirst({
      where: { fromStationId, toStationId, tenantId, isActive: true },
    });
    if (existingRate) {
      rateId = existingRate.id;
    } else {
      const newRate = await db.parcelRate.create({
        data: { fromStationId, toStationId, price: DEFAULT_PARCEL_PRICE, tenantId },
      });
      rateId = newRate.id;
    }
  } else if (preprinted.lineId) {
    const line = await db.line.findFirst({ where: { id: preprinted.lineId } });
    if (line) {
      const rate = await db.parcelRate.findFirst({
        where: { fromStationId: line.fromStationId, toStationId: line.toStationId, tenantId },
      });
      if (rate) rateId = rate.id;
    }
  }

  if (!rateId) throw new Error('Tarif non trouvé pour cette relation');

  // ✅ Generate cryptographically secure control code + PIN code
  const [controlCode, pinCode] = await Promise.all([
    generateUniqueCode(
      () => secureControlCode(),
      async (code) => {
        const exists = await db.parcel.findUnique({ where: { controlCode: code } });
        return !!exists;
      }
    ),
    generateUniqueCode(
      () => securePinCode(),
      async (code) => {
        const exists = await db.parcel.findUnique({ where: { pinCode: code } });
        return !!exists;
      }
    ),
  ]);

  await db.$transaction(async (tx) => {
    await tx.preprintedTicket.update({
      where: { id: preprinted.id },
      data: { status: 'active' },
    });
    await tx.parcel.create({
      data: {
        controlCode,
        pinCode,
        senderName: senderName || OFFLINE_PLACEHOLDER,
        senderPhone: OFFLINE_PLACEHOLDER_PHONE,
        recipientName: recipientName || OFFLINE_PLACEHOLDER,
        recipientPhone: OFFLINE_PLACEHOLDER_PHONE,
        recipientLocation: OFFLINE_PLACEHOLDER,
        price: DEFAULT_PARCEL_PRICE,
        ticketId: preprinted.id,
        rateId,
        activatedById: userId,
        tenantId,
      },
    });
  });

  return { success: true, ticketCode, controlCode, pinCode };
}

async function processParcelDelivery(
  payload: Record<string, unknown>,
  userId: string,
  tenantId: string,
  _request: NextRequest
): Promise<Record<string, unknown>> {
  const { controlCode, pinCode } = payload as {
    controlCode: string;
    pinCode?: string;
  };

  if (!controlCode) throw new Error('controlCode requis');

  const parcel = await db.parcel.findFirst({
    where: { controlCode, tenantId, status: 'IN_TRANSIT' },
  });

  if (!parcel) {
    const existing = await db.parcel.findFirst({
      where: { controlCode, tenantId },
    });
    if (existing && (existing.status === 'DELIVERED' || existing.status === 'CONFIRMED')) {
      return { idempotent: true, controlCode, message: 'Déjà livré' };
    }
    throw new Error('Colis non trouvé ou déjà livré');
  }

  if (pinCode && parcel.pinCode !== pinCode) {
    throw new Error('Code PIN incorrect');
  }

  await db.parcel.update({
    where: { id: parcel.id },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      deliveredById: userId,
    },
  });

  return { success: true, controlCode, status: 'DELIVERED' };
}
