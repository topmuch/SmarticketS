// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { DepartureStatus, MessagePriority } from "@prisma/client";

interface RouteParams {
  params: Promise<{ stationId: string }>;
}

// Helper: format date to HH:MM or HH:MM:SS
function formatTime(date: Date, withSeconds = false): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  if (withSeconds) {
    const s = date.getSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return `${h}:${m}`;
}

// Helper: priority sort order (URGENT=0, INFO=1, NORMAL=2)
function priorityOrder(p: MessagePriority): number {
  switch (p) {
    case "URGENT":
      return 0;
    case "INFO":
      return 1;
    case "NORMAL":
    default:
      return 2;
  }
}

// GET /api/signage/board/[stationId] — PUBLIC kiosk display endpoint (no auth required)
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { stationId } = await params;

    // 1. Find station by stationId
    const station = await db.station.findUnique({
      where: { id: stationId },
    });

    if (!station) {
      return NextResponse.json(
        { error: "Gare introuvable" },
        { status: 404 }
      );
    }

    const tenantId = station.tenantId;
    const now = new Date();

    // 2. Query active signage messages
    //    - Station-specific messages (stationId matches) OR global messages (stationId is null)
    //    - isActive = true
    //    - startDate <= now
    //    - endDate >= now OR endDate is null
    const messages = await db.signageMessage.findMany({
      where: {
        AND: [
          { tenantId },
          { isActive: true },
          { startDate: { lte: now } },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          { OR: [{ stationId: stationId }, { stationId: null }] },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Sort by priority: URGENT first, then INFO, then NORMAL
    messages.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));

    const messageContents = messages.map((m) => ({
      content: m.content,
      priority: m.priority,
    }));

    // 3. Query departures for today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const departures = await db.departure.findMany({
      where: {
        tenantId,
        stationId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        line: {
          include: {
            toStation: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { scheduledTime: "asc" },
    });

    // 4. Process each departure with dynamic status logic
    const processedDepartures = departures.map((dep) => {
      const scheduledTime = new Date(dep.scheduledTime);
      const diffMs = scheduledTime.getTime() - now.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const countdownMin = Math.max(0, diffMin);

      // Dynamic status logic
      let effectiveStatus: DepartureStatus = dep.status;

      if (dep.status === "SCHEDULED") {
        // If scheduled time has passed → DEPARTED
        if (diffMin < 0) {
          effectiveStatus = "DEPARTED";
        }
        // If within 10 minutes → BOARDING
        else if (diffMin <= 10) {
          effectiveStatus = "BOARDING";
        }
      }

      return {
        id: dep.id,
        lineNumber: dep.line.code,
        lineName: dep.line.name,
        destination: dep.line.toStation.name,
        platform: dep.platform || "-",
        scheduledTime: formatTime(scheduledTime),
        status: effectiveStatus,
        delayMinutes: dep.delayMinutes,
        countdownMin,
        availableSeats: dep.availableSeats,
        totalSeats: dep.totalSeats,
        notes: dep.notes,
      };
    });

    return NextResponse.json({
      stationName: station.name,
      currentTime: formatTime(now, true),
      messages: messageContents,
      departures: processedDepartures,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors du chargement du tableau d'affichage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
