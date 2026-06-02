// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const toggleGenerationSchema = z
  .object({
    allowSelfTicketGeneration: z.boolean().optional(),
    allowSelfParcelGeneration: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.allowSelfTicketGeneration !== undefined ||
      data.allowSelfParcelGeneration !== undefined,
    {
      message:
        "Au moins un champ (allowSelfTicketGeneration ou allowSelfParcelGeneration) est requis.",
    }
  );

// PATCH /api/superadmin/tenants/[id]/generation
// Toggle generation flags for a specific tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "SUPER_ADMIN");

    const { id } = await params;

    const body = await request.json();
    const parsed = toggleGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation échouée",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const existing = await db.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Transporteur introuvable." },
        { status: 404 }
      );
    }

    // Update the generation flags
    const updated = await db.tenant.update({
      where: { id },
      data: {
        ...(parsed.data.allowSelfTicketGeneration !== undefined && {
          allowSelfTicketGeneration:
            parsed.data.allowSelfTicketGeneration,
        }),
        ...(parsed.data.allowSelfParcelGeneration !== undefined && {
          allowSelfParcelGeneration:
            parsed.data.allowSelfParcelGeneration,
        }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        allowSelfTicketGeneration: true,
        allowSelfParcelGeneration: true,
      },
    });

    // Audit log
    await logAudit({
      action: "UPDATE_GENERATION_CONTROL",
      entity: "Tenant",
      entityId: id,
      details: {
        tenantName: existing.name,
        tenantSlug: existing.slug,
        ...parsed.data,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message =
      error instanceof Error
        ? error.message
        : "Échec de la mise à jour du contrôle de génération.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
