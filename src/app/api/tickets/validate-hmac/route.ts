/**
 * POST /api/tickets/validate-hmac — HMAC-Signed Ticket Validation
 *
 * Validates a ticket by its HMAC-signed QR token.
 * Flow:
 *   1. Parse + validate HMAC token
 *   2. Extract reference from payload
 *   3. Lookup ticket in DB (atomic read)
 *   4. Verify ticket status (ACTIVE only)
 *   5. Mark as VALIDATED with controller info
 *   6. Return validated ticket data
 *
 * Security: HMAC prevents ticket forgery. Timing-safe comparison.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { validateBody, validateHmacSchema } from '@/lib/validation';
import { validateHmacToken } from '@/lib/hmac';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ─── Auth check (controller or agency) ─────────────
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ─── Validate body ────────────────────────────────
    const body = await req.json();
    const parsed = validateBody(validateHmacSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error, details: parsed.details },
        { status: 400 }
      );
    }

    // ─── HMAC validation ──────────────────────────────
    const hmacResult = validateHmacToken(parsed.data.token);

    if (!hmacResult.valid) {
      return NextResponse.json({
        valid: false,
        reason: hmacResult.reason,
        expired: hmacResult.expired,
        message: hmacResult.expired
          ? 'QR code expiré. Générez un nouveau code.'
          : 'QR code invalide. Signature corrompue ou falsifiée.',
      }, { status: 400 });
    }

    // ─── Lookup ticket by reference ────────────────────
    const payload = hmacResult.payload!;

    const baggage = await db.baggage.findUnique({
      where: { reference: payload.ref },
      include: {
        passengerTicket: {
          include: {
            departure: {
              include: {
                route: true,
                originStation: true,
                destinationStation: true,
              },
            },
            agency: true,
          },
        },
        agency: true,
      },
    });

    if (!baggage || !baggage.passengerTicket) {
      return NextResponse.json({
        valid: false,
        reason: 'TICKET_NOT_FOUND',
        message: 'Aucun billet trouvé pour ce QR code.',
      }, { status: 404 });
    }

    const ticket = baggage.passengerTicket;

    // ─── Check ticket status ──────────────────────────
    if (ticket.ticketStatus === 'CANCELLED') {
      return NextResponse.json({
        valid: false,
        reason: 'CANCELLED',
        message: 'Ce billet a été annulé.',
        cancelledAt: ticket.cancelledAt,
        cancelReason: ticket.cancelReason,
      });
    }

    if (ticket.ticketStatus === 'VALIDATED') {
      return NextResponse.json({
        valid: false,
        reason: 'ALREADY_VALIDATED',
        message: 'Ce billet a déjà été validé.',
        validatedAt: ticket.validatedAt,
        validatedBy: ticket.validatedBy,
      });
    }

    if (ticket.ticketStatus !== 'ACTIVE') {
      return NextResponse.json({
        valid: false,
        reason: 'INVALID_STATUS',
        message: `Statut du billet: ${ticket.ticketStatus}`,
      });
    }

    // ─── Validate ticket (atomic update) ─────────────
    const now = new Date();
    const [updatedTicket] = await db.$transaction([
      db.passengerTicket.update({
        where: { id: ticket.id },
        data: {
          ticketStatus: 'VALIDATED',
          validatedAt: now,
          validatedBy: session.email || session.name || 'controller',
        },
        include: {
          departure: true,
          baggage: true,
          agency: true,
        },
      }),
    ]);

    // ─── Return validated data ───────────────────────
    return NextResponse.json({
      valid: true,
      reason: 'VALIDATED',
      ticket: {
        id: updatedTicket.id,
        reference: baggage.reference,
        controlCode: updatedTicket.controlCode,
        passengerName: updatedTicket.passengerName,
        passengerPhone: updatedTicket.passengerPhone,
        seatNumber: updatedTicket.seatNumber,
        destination: updatedTicket.destination,
        departureTime: updatedTicket.departureTime
          ? new Date(updatedTicket.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : null,
        platform: updatedTicket.platform,
        lineNumber: updatedTicket.departure?.lineNumber,
        validatedAt: now.toISOString(),
        validatedBy: session.email || session.name,
        agency: {
          name: updatedTicket.agency.name,
        },
      },
    });

  } catch (error) {
    console.error('[/api/tickets/validate-hmac] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
