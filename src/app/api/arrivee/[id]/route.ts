import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const confirmArrivalSchema = z.object({
  arrival_datetime: z.string().min(1, "La date/heure d'arrivée est obligatoire"),
  delivery_location: z.string().min(1, 'Le lieu de dépôt est obligatoire'),
  notes: z.string().optional().default(''),
});

// GET: Fetch colis info for the arrival page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reference = (id || '').toUpperCase().trim();

    const colis = await db.baggage.findUnique({
      where: { reference },
      include: { agency: true },
    });

    if (!colis) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ce code QR ne correspond à aucun colis.' },
        { status: 404 }
      );
    }

    // Return colis data for the arrival page
    return NextResponse.json({
      success: true,
      colis: {
        id: colis.id,
        reference: colis.reference,
        status: colis.status,
        transportType: colis.transportMode,
        company: colis.busCompany || colis.airlineName || '',
        departureCity: '', // not stored in departure, we use destination for arrival
        arrivalCity: colis.destination || '',
        departureDate: colis.departureDate,
        departureTime: colis.departureTime,
        senderName: colis.travelerFirstName || '',
        senderPhone: colis.whatsappOwner || '',
        receiverName: colis.receiverName || '',
        receiverPhone: colis.receiverWhatsapp || '',
        arrivedAt: colis.arrivedAt,
        deliveryLocation: colis.deliveryLocation,
        deliveryNotes: colis.deliveryNotes,
      },
    });
  } catch (error) {
    console.error('[/api/arrivee] GET error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}

// POST: Confirm arrival
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = confirmArrivalSchema.parse(body);

    const reference = (id || '').toUpperCase().trim();

    // Find colis
    const colis = await db.baggage.findUnique({ where: { reference } });

    if (!colis) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ce code QR ne correspond à aucun colis.' },
        { status: 404 }
      );
    }

    // Must be in_transit to confirm arrival
    if (colis.status === 'pending_activation') {
      return NextResponse.json({
        error: 'not_activated',
        message: 'Ce colis n\'a pas encore été activé.',
        reference: colis.reference,
      });
    }

    if (colis.status === 'delivered') {
      return NextResponse.json({
        error: 'already_delivered',
        message: 'Ce colis a déjà été livré.',
        reference: colis.reference,
      });
    }

    if (colis.status !== 'in_transit') {
      return NextResponse.json({
        error: 'invalid_status',
        message: `Ce colis ne peut pas être livré (statut: ${colis.status}).`,
        reference: colis.reference,
      });
    }

    const arrivedAt = new Date(data.arrival_datetime);

    // Update DB: status → delivered
    const updated = await db.baggage.update({
      where: { id: colis.id },
      data: {
        status: 'delivered',
        arrivedAt,
        deliveryLocation: data.delivery_location,
        deliveryNotes: data.notes,
        lastLocation: data.delivery_location,
      },
    });

    return NextResponse.json({
      success: true,
      colis: {
        id: updated.id,
        reference: updated.reference,
        status: updated.status,
        arrivedAt: updated.arrivedAt,
        deliveryLocation: updated.deliveryLocation,
      },
      // Return sender/receiver info for wa.me links
      sender: {
        name: updated.travelerFirstName || '',
        phone: updated.whatsappOwner || '',
      },
      receiver: {
        name: updated.receiverName || '',
        phone: updated.receiverWhatsapp || '',
      },
      arrivalCity: updated.destination || '',
    });

  } catch (error) {
    console.error('[/api/arrivee] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', message: error.issues[0].message, details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'server_error', message: "Échec de la confirmation. Réessayez." },
      { status: 500 }
    );
  }
}
