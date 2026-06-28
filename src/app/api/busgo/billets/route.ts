import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * GET /api/busgo/billets
 *
 * Liste tous les billets (PassengerTicket) groupés par destination.
 * Inclut: nom, prénom, téléphone, siège, statut (présent/absent),
 * date de départ, n° ticket papier.
 *
 * Query params:
 *   - destination: filtrer par destination spécifique
 *   - status: filtrer par statut (ACTIVE, BOARDED, ABSENT, CANCELLED)
 *   - dateFilter: "today" | "upcoming" | "all" (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let agencyId = session.agencyId;
    if (!agencyId) {
      if (session.role !== 'superadmin') {
        return NextResponse.json({ error: 'Aucune agence associée' }, { status: 403 });
      }
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) return NextResponse.json({ error: 'Aucune agence' }, { status: 400 });
      agencyId = firstAgency.id;
    }

    const { searchParams } = new URL(request.url);
    const destFilter = searchParams.get('destination') || '';
    const statusFilter = searchParams.get('status') || '';
    const dateFilter = searchParams.get('dateFilter') || 'all';

    // Date range
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateWhere: Record<string, unknown> = {};
    if (dateFilter === 'today') {
      dateWhere = { departure: { scheduledTime: { gte: todayStart, lt: tomorrow } } };
    } else if (dateFilter === 'upcoming') {
      dateWhere = { departure: { scheduledTime: { gte: todayStart } } };
    }

    const tickets = await db.passengerTicket.findMany({
      where: {
        agencyId,
        ...(destFilter ? { destination: { contains: destFilter, mode: 'insensitive' } } : {}),
        ...(statusFilter ? { ticketStatus: statusFilter } : {}),
        ...dateWhere,
      },
      include: {
        departure: {
          select: {
            id: true,
            lineNumber: true,
            destination: true,
            scheduledTime: true,
            platform: true,
            status: true,
            delayMinutes: true,
          },
        },
      },
      orderBy: [
        { destination: 'asc' },
        { departure: { scheduledTime: 'asc' } },
        { seatNumber: 'asc' },
      ],
    });

    // Group by destination
    const grouped: Record<string, {
      destination: string;
      count: number;
      boarded: number;
      absent: number;
      active: number;
      cancelled: number;
      billets: Array<{
        id: string;
        passengerName: string;
        passengerPhone: string;
        seatNumber: string;
        paperTicketNumber: string | null;
        ticketStatus: string;
        boardedAt: string | null;
        isLate: boolean;
        lateMinutes: number;
        pwaInstalled: boolean;
        destination: string;
        departure: {
          id: string;
          lineNumber: string;
          scheduledTime: string;
          platform: string | null;
          status: string;
        } | null;
      }>;
    }> = {};

    for (const t of tickets) {
      const dest = t.destination || 'Inconnue';
      if (!grouped[dest]) {
        grouped[dest] = {
          destination: dest,
          count: 0,
          boarded: 0,
          absent: 0,
          active: 0,
          cancelled: 0,
          billets: [],
        };
      }

      const g = grouped[dest];
      g.count++;

      if (t.ticketStatus === 'BOARDED') g.boarded++;
      else if (t.ticketStatus === 'ABSENT') g.absent++;
      else if (t.ticketStatus === 'ACTIVE') g.active++;
      else if (t.ticketStatus === 'CANCELLED') g.cancelled++;

      g.billets.push({
        id: t.id,
        passengerName: t.passengerName,
        passengerPhone: t.passengerPhone,
        seatNumber: t.seatNumber,
        paperTicketNumber: t.paperTicketNumber,
        ticketStatus: t.ticketStatus,
        boardedAt: t.boardedAt?.toISOString() || null,
        isLate: t.isLate,
        lateMinutes: t.lateMinutes,
        pwaInstalled: t.pwaInstalled,
        destination: t.destination,
        departure: t.departureId ? {
          id: t.departure.id,
          lineNumber: t.departure.lineNumber,
          scheduledTime: t.departure.scheduledTime.toISOString(),
          platform: t.departure.platform,
          status: t.departure.status,
        } : null,
      });
    }

    // Convert to sorted array
    const result = Object.values(grouped).sort((a, b) => a.destination.localeCompare(b.destination));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[API /api/busgo/billets]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
