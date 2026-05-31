import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema
const validateTicketSchema = z.object({
  controlCode: z
    .string()
    .min(6, 'Le code doit contenir au moins 6 chiffres')
    .max(8, 'Le code ne peut pas dépasser 8 chiffres')
    .regex(/^\d+$/, 'Le code doit contenir uniquement des chiffres'),
  agencyId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = validateTicketSchema.parse(body);

    const controlCode = data.controlCode.trim();

    // Build where clause
    const where: Record<string, unknown> = { controlCode };
    if (data.agencyId) {
      where.agencyId = data.agencyId;
    }

    // Find ticket by control code
    const ticket = await db.passengerTicket.findFirst({
      where,
      include: {
        baggage: true,
        agency: true,
      },
    });

    // Not found
    if (!ticket) {
      return NextResponse.json({
        valid: false,
        ticketStatus: 'NOT_FOUND',
        message: 'Ce code ne correspond à aucun billet actif.',
      });
    }

    // Check ticket status
    if (ticket.ticketStatus === 'CANCELLED') {
      return NextResponse.json({
        valid: false,
        ticketStatus: 'CANCELLED',
        message: 'Ce billet a été annulé.',
        cancelledAt: ticket.cancelledAt,
        cancelReason: ticket.cancelReason,
      });
    }

    if (ticket.ticketStatus === 'VALIDATED') {
      return NextResponse.json({
        valid: false,
        ticketStatus: 'VALIDATED',
        message: 'Ce billet a déjà été utilisé.',
        validatedAt: ticket.validatedAt,
        validatedBy: ticket.validatedBy,
      });
    }

    if (ticket.ticketStatus !== 'ACTIVE') {
      return NextResponse.json({
        valid: false,
        ticketStatus: ticket.ticketStatus,
        message: `Statut du billet: ${ticket.ticketStatus}`,
      });
    }

    // ─── VALID TICKET ─── Mark as validated
    const now = new Date();
    await db.passengerTicket.update({
      where: { id: ticket.id },
      data: {
        ticketStatus: 'VALIDATED',
        validatedAt: now,
        validatedBy: 'controller',
      },
    });

    // Format departure time
    const departureTime = ticket.departureTime
      ? new Date(ticket.departureTime).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : ticket.baggage?.departureTime || null;

    // Build destination display
    const origin = ticket.baggage?.departureCity || '';
    const dest = ticket.destination || ticket.baggage?.destination || '';
    const destinationDisplay = origin && dest ? `${origin} \u2192 ${dest}` : dest;

    return NextResponse.json({
      valid: true,
      ticketStatus: 'VALIDATED',
      passengerName: ticket.passengerName,
      destination: destinationDisplay,
      seatNumber: ticket.seatNumber,
      departureTime,
      controlCode: ticket.controlCode,
      validatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[/api/validate-ticket] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false, error: 'validation', message: error.issues[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { valid: false, error: 'server_error', message: 'Erreur serveur. Réessayez.' },
      { status: 500 },
    );
  }
}
