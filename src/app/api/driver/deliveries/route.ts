import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DRIVER_COOKIE_NAME = 'smartickets_driver_session';
const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;

// ─── Helper: Get driver session user ────────────────────────────────────

async function getDriverSession(request: NextRequest) {
  const sessionId = request.cookies.get(DRIVER_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }
  const inactivityThreshold = new Date(Date.now() - INACTIVITY_TIMEOUT_MS);
  if (session.lastActivity < inactivityThreshold) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  // Check role
  const user = session.user;
  if (user.role !== 'agent' && user.role !== 'agency' && user.role !== 'driver') {
    return null;
  }

  return { session, user };
}

// ─── GET: List in-transit deliveries for driver ─────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await getDriverSession(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 },
      );
    }

    // Update session activity
    await db.session
      .update({
        where: { id: auth.session.id },
        data: { lastActivity: new Date() },
      })
      .catch(() => {});

    // Query in-transit parcels (category: parcel = colis only, not tickets)
    const whereClause: Record<string, unknown> = {
      status: 'in_transit',
      category: 'parcel',
    };

    if (auth.user.agencyId) {
      whereClause.agencyId = auth.user.agencyId;
    }

    const deliveries = await db.baggage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        departureCity: true,
        destination: true,
        receiverName: true,
        receiverWhatsapp: true,
        pickupAddress: true,
        colisType: true,
        colisTypeOther: true,
        colisWeight: true,
        colisColor: true,
        paymentStatus: true,
        estimatedArrival: true,
        departureTime: true,
        whatsappOwner: true,
        travelerFirstName: true,
        travelerLastName: true,
        retrievalPin: true,
      },
    });

    // Mask sensitive data for privacy
    const maskPhone = (phone: string | null): string | null => {
      if (!phone) return null;
      const clean = phone.replace(/[^0-9+]/g, '').replace(/^0+/, '');
      if (clean.length <= 6) return '***';
      return clean.slice(0, 4) + '***' + clean.slice(-2);
    };

    const maskedDeliveries = deliveries.map((d) => ({
      ...d,
      receiverWhatsapp: maskPhone(d.receiverWhatsapp),
      whatsappOwner: maskPhone(d.whatsappOwner),
      retrievalPin: d.retrievalPin ? `***${d.retrievalPin.slice(-3)}` : null,
    }));

    return NextResponse.json({ deliveries: maskedDeliveries, count: maskedDeliveries.length });
  } catch (error) {
    console.error('Driver deliveries error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
