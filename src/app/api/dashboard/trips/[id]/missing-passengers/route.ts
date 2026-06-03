import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/trips/[id]/missing-passengers
 *
 * Returns:
 *  - summary: { departureId, destination, scheduledTime, platform, totalSold, totalScanned, missingCount }
 *  - missingPassengers: { passengerName, seatNumber, ticketId, baggageId, controlCode, passengerPhone, status }
 */
interface MissingPassenger {
  passengerName: string;
  seatNumber: string;
  ticketId: string;
  baggageId: string;
  controlCode: string;
  passengerPhone: string;
  status: 'MISSING';
}

interface TripSummary {
  departureId: string;
  destination: string;
  lineNumber: string;
  scheduledTime: string;
  platform: string | null;
  status: string;
  totalSold: number;
  totalScanned: number;
  missingCount: number;
  minutesBeforeDeparture: number;
  isAlertTriggered: boolean; // true if within 15min window and missing > 0
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Find the departure (trip)
    const departure = await db.departure.findUnique({
      where: { id },
      include: {
        route: { select: { name: true, origin: true, destination: true } },
        agency: { select: { id: true, name: true } },
        tickets: {
          where: {
            // Only ACTIVE and USED tickets count as "sold"
            ticketStatus: { in: ['ACTIVE', 'USED'] },
          },
          select: {
            id: true,
            baggageId: true,
            passengerName: true,
            passengerPhone: true,
            seatNumber: true,
            controlCode: true,
            ticketStatus: true,
            validatedAt: true,
            baggage: {
              select: { status: true },
            },
          },
        },
      },
    });

    if (!departure) {
      return NextResponse.json({ error: 'Départ non trouvé' }, { status: 404 });
    }

    // Agency isolation check
    if (session.role !== 'superadmin' && departure.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // 2. Compute missing passengers
    const soldTickets = departure.tickets;
    const scannedTickets = soldTickets.filter(
      (t) => t.ticketStatus === 'USED' && t.validatedAt
    );
    const missingTickets = soldTickets.filter(
      (t) => t.ticketStatus === 'ACTIVE'
    );

    // 3. Time calculation: minutes before departure
    const now = new Date();
    const scheduledTime = new Date(departure.scheduledTime);
    const delayMs = departure.delayMinutes ? departure.delayMinutes * 60_000 : 0;
    const effectiveTime = new Date(scheduledTime.getTime() + delayMs);
    const diffMin = Math.floor((effectiveTime.getTime() - now.getTime()) / 60_000);

    const isAlertTriggered = diffMin <= 15 && diffMin > -60 && missingTickets.length > 0;

    // 4. Build missing passengers list
    const missingPassengers: MissingPassenger[] = missingTickets.map((t) => ({
      passengerName: t.passengerName,
      seatNumber: t.seatNumber,
      ticketId: t.id,
      baggageId: t.baggageId,
      controlCode: t.controlCode,
      passengerPhone: t.passengerPhone,
      status: 'MISSING',
    }));

    const summary: TripSummary = {
      departureId: departure.id,
      destination: departure.destination,
      lineNumber: departure.lineNumber,
      scheduledTime: scheduledTime.toISOString(),
      platform: departure.platform,
      status: departure.status,
      totalSold: soldTickets.length,
      totalScanned: scannedTickets.length,
      missingCount: missingTickets.length,
      minutesBeforeDeparture: diffMin,
      isAlertTriggered,
    };

    return NextResponse.json({
      summary,
      missingPassengers,
    });
  } catch (error) {
    console.error('[missing-passengers] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
