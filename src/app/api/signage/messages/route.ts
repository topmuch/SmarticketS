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
import { Prisma } from "@prisma/client";

const createMessageSchema = z.object({
  content: z.string().min(1, "Le contenu du message est requis"),
  priority: z.enum(["NORMAL", "URGENT", "INFO"]).default("NORMAL"),
  startDate: z.string().min(1, "La date de début est requise"),
  endDate: z.string().nullable().optional(),
  stationId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/signage/messages — List signage messages with filters
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "OPERATOR", "SUPER_ADMIN");

    const { searchParams } = new URL(request.url);
    const priority = searchParams.get("priority") || "";
    const isActiveParam = searchParams.get("isActive") || "";
    const stationId = searchParams.get("stationId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    // Determine tenantId filter
    let tenantFilterId: string | undefined;

    if (payload.tenantId) {
      tenantFilterId = payload.tenantId;
    } else if (payload.role !== "SUPER_ADMIN") {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour voir les messages."
      );
    }

    // Build where clause
    const where: Prisma.SignageMessageWhereInput = {
      ...(tenantFilterId ? { tenantId: tenantFilterId } : {}),
      ...(priority ? { priority: priority as "NORMAL" | "URGENT" | "INFO" } : {}),
      ...(isActiveParam !== "" ? { isActive: isActiveParam === "true" } : {}),
      ...(stationId === "global"
        ? { stationId: null }
        : stationId
          ? { stationId }
          : {}),
    };

    const skip = (page - 1) * limit;

    // Priority sort order for Prisma (URGENT=0, INFO=1, NORMAL=2)
    const prioritySort: Record<string, number> = { URGENT: 0, INFO: 1, NORMAL: 2 };

    const [messages, total] = await Promise.all([
      db.signageMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        include: {
          station: { select: { id: true, name: true, city: true } },
        },
      }),
      db.signageMessage.count({ where }),
    ]);

    // Sort by priority (URGENT first) using our custom order
    messages.sort((a, b) => prioritySort[a.priority] - prioritySort[b.priority]);

    return NextResponse.json({
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Échec du chargement des messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/signage/messages — Create a new signage message
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "OPERATOR", "SUPER_ADMIN");

    if (!payload.tenantId) {
      return forbiddenResponse(
        "Vous devez appartenir à une société pour créer des messages."
      );
    }

    const body = await request.json();
    const parsed = createMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content, priority, startDate, endDate, stationId, isActive } = parsed.data;

    // Parse dates
    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return NextResponse.json(
        { error: "Format de date de début invalide" },
        { status: 400 }
      );
    }

    let parsedEndDate: Date | null = null;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return NextResponse.json(
          { error: "Format de date de fin invalide" },
          { status: 400 }
        );
      }
    }

    // If stationId is provided, validate it belongs to the tenant
    if (stationId) {
      const station = await db.station.findFirst({
        where: { id: stationId, tenantId: payload.tenantId },
      });

      if (!station) {
        return NextResponse.json(
          { error: "Gare introuvable ou non autorisée" },
          { status: 404 }
        );
      }
    }

    // Create message
    const message = await db.signageMessage.create({
      data: {
        content,
        priority,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        stationId: stationId || null,
        isActive,
        tenantId: payload.tenantId,
      },
      include: {
        station: { select: { id: true, name: true, city: true } },
      },
    });

    // Audit
    await logAudit({
      action: "CREATE_SIGNAGE_MESSAGE",
      entity: "SignageMessage",
      entityId: message.id,
      details: {
        content: content.slice(0, 100),
        priority,
        startDate: parsedStartDate.toISOString(),
        endDate: parsedEndDate?.toISOString() || null,
        isGlobal: !stationId,
        stationId: stationId || null,
        isActive,
      },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(message, { status: 201 });
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
    const message = error instanceof Error ? error.message : "Échec de la création du message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
