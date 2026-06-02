// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";

// GET /api/admin/qr/stock
// Retrieve QR stock for the authenticated tenant's admin/operator
export async function GET(request: NextRequest) {
  try {
    // 1. Auth: ADMIN or OPERATOR only
    const payload = await getAuthUser(request);
    requireRole(payload, "ADMIN", "OPERATOR");

    // 2. Strict tenant isolation — use payload.tenantId
    if (!payload.tenantId) {
      return forbiddenResponse(
        "Aucun transporteur associé à votre compte."
      );
    }
    const tenantId: string = payload.tenantId;

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const printBatchId = searchParams.get("printBatchId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    // 4. Compute stats via groupBy
    const statusGroups = await db.preprintedTicket.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { id: true },
    });

    const statsMap: Record<string, number> = {
      total: 0,
      inactive: 0,
      active: 0,
      used: 0,
      cancelled: 0,
    };

    for (const group of statusGroups) {
      statsMap[group.status] = group._count.id;
      statsMap.total += group._count.id;
    }

    // 5. Build the ticket query with filters
    const whereClause: Record<string, unknown> = { tenantId };

    if (status) {
      whereClause.status = status;
    }
    if (printBatchId) {
      whereClause.printBatchId = printBatchId;
    }
    if (search) {
      whereClause.ticketCode = { contains: search };
    }

    // 6. Fetch paginated ticket list with includes
    const take = 50;
    const skip = (page - 1) * take;

    const [tickets, totalFiltered] = await Promise.all([
      db.preprintedTicket.findMany({
        where: whereClause,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          departure: {
            select: {
              scheduledTime: true,
              status: true,
              line: {
                select: {
                  name: true,
                  code: true,
                  toStation: {
                    select: {
                      name: true,
                      city: true,
                    },
                  },
                },
              },
            },
          },
          printBatch: {
            select: {
              startNumber: true,
              endNumber: true,
            },
          },
        },
      }),
      db.preprintedTicket.count({
        where: whereClause,
      }),
    ]);

    // Map tickets for cleaner response
    const mappedTickets = tickets.map((ticket) => ({
      id: ticket.id,
      ticketCode: ticket.ticketCode,
      qrHash: ticket.qrHash,
      status: ticket.status,
      type: ticket.type,
      activatedAt: ticket.activatedAt,
      validatedAt: ticket.validatedAt,
      createdAt: ticket.createdAt,
      departure: ticket.departure
        ? {
            lineNumber: ticket.departure.line?.code ?? null,
            lineName: ticket.departure.line?.name ?? null,
            scheduledTime: ticket.departure.scheduledTime,
            destination:
              ticket.departure.line?.toStation
                ? `${ticket.departure.line.toStation.name} (${ticket.departure.line.toStation.city})`
                : null,
          }
        : null,
      printBatch: ticket.printBatch
        ? {
            startNumber: ticket.printBatch.startNumber,
            endNumber: ticket.printBatch.endNumber,
          }
        : null,
    }));

    // 7. Fetch list of PrintBatches for this tenant (filter dropdown)
    const printBatches = await db.printBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quantity: true,
        startNumber: true,
        endNumber: true,
        createdAt: true,
        generatedBy: true,
      },
    });

    // 8. Return response
    return NextResponse.json({
      stats: statsMap,
      tickets: mappedTickets,
      pagination: {
        page,
        take,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / take),
      },
      printBatches,
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
        : "Échec du chargement du stock QR.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
