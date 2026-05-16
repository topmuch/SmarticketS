import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const WHATSAPP_REGEX = /^\+[1-9]\d{1,14}$/;

const senderSchema = z.object({
  name: z.string().min(1, "Le nom de l'expéditeur est obligatoire"),
  phone: z.string().regex(WHATSAPP_REGEX, 'Format WhatsApp invalide (ex: +221771234567)'),
});

const receiverSchema = z.object({
  name: z.string().min(1, 'Le nom du destinataire est obligatoire'),
  phone: z.string().regex(WHATSAPP_REGEX, 'Format WhatsApp invalide (ex: +221761234567)'),
});

const activateSchema = z.object({
  transport_type: z.enum(['GP', 'BUS'], { required_error: 'Le type de transport est obligatoire' }),
  company_name: z.string().min(1, 'La compagnie est obligatoire'),
  departure_city: z.string().min(1, 'La ville de départ est obligatoire'),
  arrival_city: z.string().min(1, "La ville d'arrivée est obligatoire"),
  departure_datetime: z.string().min(1, 'La date/heure de départ est obligatoire'),
  sender: senderSchema,
  receiver: receiverSchema,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = activateSchema.parse(body);

    const reference = (id || '').toUpperCase().trim();

    // Find colis by reference
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

    // Handle special statuses
    if (colis.status === 'in_transit') {
      return NextResponse.json({
        error: 'already_in_transit',
        message: 'Ce colis est déjà en transit.',
        reference: colis.reference,
      });
    }
    if (colis.status === 'delivered' || colis.status === 'found') {
      return NextResponse.json({
        error: 'already_delivered',
        message: 'Ce colis a déjà été livré.',
        reference: colis.reference,
      });
    }
    if (colis.status === 'active' || colis.status === 'scanned') {
      return NextResponse.json({
        error: 'already_active',
        message: 'Ce colis a déjà été activé.',
        reference: colis.reference,
      });
    }
    if (colis.status === 'blocked') {
      return NextResponse.json(
        { error: 'blocked', message: 'Ce colis a été bloqué. Contactez le support.' },
        { status: 403 }
      );
    }
    if (colis.status !== 'pending_activation') {
      return NextResponse.json(
        { error: 'invalid_status', message: `Statut invalide : ${colis.status}` },
        { status: 400 }
      );
    }

    // Validate departure_datetime is not in the past
    const depDateTime = new Date(data.departure_datetime);
    const now = new Date();
    if (depDateTime < now) {
      return NextResponse.json(
        { error: 'invalid_date', message: 'La date de départ ne peut pas être antérieure à maintenant.' },
        { status: 400 }
      );
    }

    // Expiration: 90 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Parse datetime for separate date/time fields
    const depDate = depDateTime.toISOString().split('T')[0];
    const depTime = depDateTime.toTimeString().slice(0, 5);

    // Update colis in DB — status → in_transit
    const updated = await db.baggage.update({
      where: { id: colis.id },
      data: {
        status: 'in_transit',
        transportMode: 'bus',
        busCompany: data.company_name,
        destination: data.arrival_city,
        departureDate: depDateTime,
        departureTime: depTime,
        travelerFirstName: data.sender.name,
        whatsappOwner: data.sender.phone,
        receiverName: data.receiver.name,
        receiverWhatsapp: data.receiver.phone,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      colis: {
        id: updated.id,
        reference: updated.reference,
        status: updated.status,
      },
    });

  } catch (error) {
    console.error('[/api/activate] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', message: error.issues[0].message, details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'server_error', message: "Échec de l'activation. Vérifiez votre connexion et réessayez." },
      { status: 500 }
    );
  }
}
