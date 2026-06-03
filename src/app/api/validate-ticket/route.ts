import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { getSession, type SessionUser } from '@/lib/session';
import { validatePwaToken, type PwaTokenPayload } from '@/lib/pwa-guard';
import { verifyStaffAccessToken } from '@/lib/rbac';

// Validation schema
const validateTicketSchema = z.object({
  controlCode: z
    .string()
    .min(1, 'Le code est obligatoire'),
  agencyId: z.string().optional(),
});

/** Normalized auth context from session, PWA token or Staff JWT */
interface AuthContext {
  role: string;
  agencyId?: string | null;
}

/**
 * Authenticate the request via cookie session, PWA token, or Staff JWT.
 * Returns null if no auth method succeeds.
 */
async function authenticateRequest(request: NextRequest): Promise<AuthContext | null> {
  // Strategy 1: Cookie-based session (web dashboard / admin)
  const session: SessionUser | null = await getSession();
  if (session) {
    return { role: session.role, agencyId: session.agencyId };
  }

  // Strategy 2 & 3: Bearer token — try Staff JWT first, then PWA token
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Strategy 2: Staff JWT (from field-login, signed with JWT_SECRET)
    const staffPayload = verifyStaffAccessToken(token);
    if (staffPayload) {
      // Normalize role: StaffJwtPayload.role is e.g. "CONTROLLER" → lowercase for matching
      return {
        role: staffPayload.role.toLowerCase(),
        agencyId: staffPayload.agencyId,
      };
    }

    // Strategy 3: PWA Bearer token (from QR URL, signed with HMAC-SHA256)
    const result = await validatePwaToken(token);
    if (result.valid && result.payload) {
      const payload: PwaTokenPayload = result.payload;
      return { role: payload.role, agencyId: payload.agencyId };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }
    if (!['controller', 'agency', 'admin', 'superadmin', 'agent', 'driver'].includes(auth.role)) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

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
    // Error logging intentional
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
