import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { generateTicketCode, generateQrHash, generateBatchId } from "@/lib/tickets";
import { generateQrBatchSchema } from "@/lib/schemas/qr-stock";

// POST /api/superadmin/qr/generate-batch
// Generate a batch of inactive QR tickets for a specific tenant
export async function POST(request: NextRequest) {
  try {
    // 1. Auth: only SUPER_ADMIN can generate QR batches
    const payload = await getAuthUser(request);
    requireRole(payload, "SUPER_ADMIN");

    // 2. Validate request body
    const body = await request.json();
    const parsed = generateQrBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation échouée",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { tenantId, quantity, startFrom } = parsed.data;

    // 3. Verify the target tenant exists
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Transporteur introuvable." },
        { status: 404 }
      );
    }

    // 4. Count existing preprinted tickets for that tenant to determine next index
    const existingCount: number = await db.preprintedTicket.count({
      where: { tenantId },
    });

    // The starting index is max of existingCount+1 and user's startFrom
    const startIndex = Math.max(existingCount + 1, startFrom);

    // 5-6. Generate batch + tickets in a single transaction
    const batchId = generateBatchId();
    const endNumber = startIndex + quantity - 1;

    // Pre-generate ticket data outside the transaction for deterministic codes
    const ticketData = Array.from({ length: quantity }, (_, i) => ({
      ticketCode: generateTicketCode(startIndex + i),
      qrHash: generateQrHash(),
    }));

    const [printBatch] = await db.$transaction([
      // Create the PrintBatch record
      db.printBatch.create({
        data: {
          id: batchId,
          tenantId,
          quantity,
          startNumber: generateTicketCode(startIndex),
          endNumber: generateTicketCode(endNumber),
          generatedBy: payload.userId,
        },
      }),
      // Create all PreprintedTicket records
      db.preprintedTicket.createMany({
        data: ticketData.map((ticket) => ({
          ticketCode: ticket.ticketCode,
          qrHash: ticket.qrHash,
          status: "inactive",
          printBatchId: batchId,
          tenantId,
        })),
      }),
    ]);

    // 8. Audit log
    await logAudit({
      action: "GENERATE_QR_BATCH",
      entity: "PrintBatch",
      entityId: printBatch.id,
      details: {
        tenantId,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        quantity,
        startNumber: printBatch.startNumber,
        endNumber: printBatch.endNumber,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    // 9. Return response
    return NextResponse.json({
      success: true,
      batchId: printBatch.id,
      range: {
        start: printBatch.startNumber,
        end: printBatch.endNumber,
      },
      quantity,
      tickets: ticketData.map((t) => ({
        ticketCode: t.ticketCode,
        qrHash: t.qrHash,
      })),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Authorization") ||
        error.message.includes("Missing") ||
        error.message.includes("Invalid") ||
        error.message.includes("expired"))
    ) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message =
      error instanceof Error
        ? error.message
        : "Échec de la génération du lot de QR.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
