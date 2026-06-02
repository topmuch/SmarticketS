import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  requireTenantAccess,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { checkGenerationPermission } from "@/lib/generation-guard";
import {
  generateTicketCode,
  generateQrHash,
  generateBatchId,
} from "@/lib/tickets";

const generateBatchSchema = z.object({
  lineId: z.string().optional(),
  count: z
    .number()
    .int()
    .min(1, "Le nombre minimum est 1")
    .max(500, "Le nombre maximum est 500"),
});

// POST /api/tickets/generate-batch — Generate a batch of preprinted tickets
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "SUPER_ADMIN", "ADMIN");

    // 🛑 Generation Guard: check if tenant is allowed to generate
    const genCheck = await checkGenerationPermission(payload, "ticket");
    if (!genCheck.allowed) return genCheck.response;

    if (!payload.tenantId) {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour générer des tickets."
      );
    }

    const body = await request.json();
    const parsed = generateBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { lineId, count } = parsed.data;

    // If lineId provided, verify it belongs to the tenant
    if (lineId) {
      requireTenantAccess(payload, payload.tenantId);
      const line = await db.line.findFirst({
        where: { id: lineId, tenantId: payload.tenantId },
      });
      if (!line) {
        return NextResponse.json(
          { error: "Ligne introuvable pour cette société." },
          { status: 404 }
        );
      }
    }

    // Count existing tickets for this tenant to get the next index
    const existingCount = await db.preprintedTicket.count({
      where: { tenantId: payload.tenantId },
    });

    const batchId = generateBatchId();

    const ticketsData: Array<{
      ticketCode: string;
      qrHash: string;
      type: string;
      status: string;
      batchId: string;
      lineId: string | undefined;
      tenantId: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const index = existingCount + i + 1;
      ticketsData.push({
        ticketCode: generateTicketCode(index),
        qrHash: generateQrHash(),
        type: "TICKET",
        status: "inactive",
        batchId,
        lineId: lineId ?? undefined,
        tenantId: payload.tenantId,
      });
    }

    // Use transaction for atomicity
    const createdTickets = await db.$transaction(
      ticketsData.map((ticket) =>
        db.preprintedTicket.create({
          data: ticket,
          select: { id: true, ticketCode: true, qrHash: true },
        })
      )
    );

    await logAudit({
      action: "GENERATE_BATCH",
      entity: "PreprintedTicket",
      details: {
        batchId,
        count,
        lineId: lineId ?? "none",
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(
      {
        batchId,
        count,
        tickets: createdTickets,
      },
      { status: 201 }
    );
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
    const message = error instanceof Error ? error.message : "Échec de la génération de tickets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
