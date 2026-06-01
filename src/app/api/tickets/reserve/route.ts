/**
 * POST /api/tickets/reserve — Atomic Ticket Reservation
 *
 * Creates a PassengerTicket + Baggage + generates HMAC-signed QR code.
 * Uses Prisma $transaction for atomicity:
 *   1. Lock departure row (verify seats available)
 *   2. Decrement availableSeats
 *   3. Create Baggage record
 *   4. Create PassengerTicket record
 *   5. Generate HMAC token for QR
 *   6. Create ColisEvent (activation)
 *
 * If any step fails, entire transaction rolls back.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { validateBody, reserveTicketSchema } from '@/lib/validation';
import { generateControlCode } from '@/lib/qr';
import { generateHmacToken } from '@/lib/hmac';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ─── Auth check ──────────────────────────────────
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const agencyId = session.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Aucune agence associée' }, { status: 403 });
    }

    // ─── Validate body ────────────────────────────────
    const body = await req.json();
    const parsed = validateBody(reserveTicketSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error, details: parsed.details },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // ─── Atomic transaction ──────────────────────────
    const result = await db.$transaction(async (tx) => {
      // 1. Lock and verify departure
      const departure = await tx.departure.findFirst({
        where: {
          id: data.departureId,
          agencyId,
          status: { in: ['SCHEDULED', 'BOARDING'] },
        },
      });

      if (!departure) {
        throw new Error('DEPARTURE_NOT_FOUND');
      }

      if (departure.availableSeats <= 0) {
        throw new Error('NO_SEATS_AVAILABLE');
      }

      // Check seat not already taken for this departure
      const seatTaken = await tx.passengerTicket.findFirst({
        where: {
          departureId: data.departureId,
          seatNumber: data.seatNumber,
          ticketStatus: { not: 'CANCELLED' },
        },
      });

      if (seatTaken) {
        throw new Error('SEAT_ALREADY_TAKEN');
      }

      // 2. Decrement seats
      await tx.departure.update({
        where: { id: data.departureId },
        data: { availableSeats: { decrement: 1 } },
      });

      // 3. Generate unique reference + control code
      const reference = `${departure.lineNumber.replace(/\s/g, '').substring(0, 4).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const controlCode = await generateControlCode(6);

      // 4. Create baggage record
      const baggage = await tx.baggage.create({
        data: {
          reference,
          type: 'voyageur',
          category: 'ticket',
          agencyId,
          status: 'active',
          transportMode: 'bus',
          busCompany: departure.lineNumber,
          departureCity: departure.originStation?.name || '',
          destination: departure.destination,
          departureDate: departure.scheduledTime,
          departureTime: departure.scheduledTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          whatsappOwner: data.passengerPhone,
          travelerFirstName: data.passengerName.split(' ')[0] || data.passengerName,
          travelerLastName: data.passengerName.split(' ').slice(1).join(' ') || '',
          colisType: 'CABIN',
          activatedAt: new Date(),
          activatedAtStationId: departure.originStationId,
        },
      });

      // 5. Create passenger ticket
      const ticket = await tx.passengerTicket.create({
        data: {
          baggageId: baggage.id,
          agencyId,
          departureId: data.departureId,
          passengerName: data.passengerName,
          passengerPhone: data.passengerPhone,
          passengerAge: data.passengerAge,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          hasParentalAuth: data.hasParentalAuth,
          destination: departure.destination,
          seatNumber: data.seatNumber,
          platform: data.platform || departure.platform,
          departureTime: departure.scheduledTime,
          luggageCount: data.luggageCount,
          luggageWeightKg: data.luggageWeightKg,
          luggageFee: data.luggageFee,
          controlCode,
          ticketStatus: 'ACTIVE',
          activatedAt: new Date(),
        },
      });

      // 6. Generate HMAC token
      const hmacResult = generateHmacToken({
        ref: reference,
        controlCode,
        agencyId,
        passengerPhone: data.passengerPhone,
        baggageType: 'ticket',
        departureId: data.departureId,
      });

      // 7. Create ColisEvent (activation event)
      await tx.colisEvent.create({
        data: {
          baggageId: baggage.id,
          eventType: 'activation',
          recipientType: 'sender',
          recipientName: data.passengerName,
          recipientPhone: data.passengerPhone,
          messageTitle: 'Billet Réservé',
          messageContent: `Billet ${reference} réservé — ${departure.destination}, siège ${data.seatNumber}`,
        },
      });

      return {
        ticket,
        baggage,
        reference,
        controlCode,
        hmacToken: hmacResult.token,
        hmacExpiresAt: hmacResult.expiresAt,
        qrData: hmacResult.qrData,
        departure: {
          destination: departure.destination,
          lineNumber: departure.lineNumber,
          scheduledTime: departure.scheduledTime,
          platform: departure.platform,
        },
      };
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: result.ticket.id,
        reference: result.reference,
        controlCode: result.controlCode,
        passengerName: result.ticket.passengerName,
        seatNumber: result.ticket.seatNumber,
        destination: result.ticket.destination,
        departureTime: result.departure.scheduledTime,
        platform: result.departure.platform,
        lineNumber: result.departure.lineNumber,
        ticketStatus: 'ACTIVE',
      },
      qr: {
        token: result.hmacToken,
        qrData: result.qrData,
        expiresAt: result.hmacExpiresAt,
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';

    // Known business errors
    const businessErrors: Record<string, { status: number; msg: string }> = {
      DEPARTURE_NOT_FOUND: { status: 404, msg: 'Départ introuvable ou annulé' },
      NO_SEATS_AVAILABLE: { status: 409, msg: 'Plus aucune place disponible' },
      SEAT_ALREADY_TAKEN: { status: 409, msg: `Siège ${parsed.success ? (parsed.data as Record<string, unknown>).seatNumber : '?'} déjà occupé` },
    };

    const bizErr = businessErrors[message];
    if (bizErr) {
      return NextResponse.json({ error: bizErr.msg }, { status: bizErr.status });
    }

    console.error('[/api/tickets/reserve] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
