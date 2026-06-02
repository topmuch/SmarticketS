import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateExpirationDate } from '@/lib/qr';
import { z } from 'zod';

// PUBLIC ENDPOINT — intentionally unauthenticated for QR scanning

const WHATSAPP_REGEX = /^\+[1-9]\d{1,14}$/;

// Schema accepts both old fields (sender/receiver) and new fields (traveler)
const activateSchema = z.object({
  reference: z.string().min(1, 'La référence est obligatoire'),
  // Transport mode (optional, defaults to flight)
  transportMode: z.enum(['flight', 'train', 'boat', 'bus']).optional().default('flight'),
  // Traveler info (new format from /inscrire)
  travelerFirstName: z.string().optional(),
  travelerLastName: z.string().optional(),
  whatsappOwner: z.string().optional(),
  // Sender/Receiver info (old format)
  senderName: z.string().optional(),
  senderWhatsapp: z.string().optional(),
  receiverName: z.string().optional(),
  receiverWhatsapp: z.string().optional(),
  // Transport details
  airlineName: z.string().optional(),
  flightNumber: z.string().optional(),
  trainCompany: z.string().optional(),
  trainNumber: z.string().optional(),
  shipName: z.string().optional(),
  shipCabin: z.string().optional(),
  busCompany: z.string().optional(),
  busLineNumber: z.string().optional(),
  company: z.string().optional(),
  departureCity: z.string().optional(),
  arrivalCity: z.string().optional(),
  // Date/time
  departureDate: z.string().optional(),
  departureTime: z.string().optional(),
  // Destination
  destination: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = activateSchema.parse(body);

    // Find baggage by reference
    const baggage = await db.baggage.findUnique({
      where: { reference: (data.reference || '').toUpperCase() },
      include: { agency: true },
    });

    if (!baggage) {
      return NextResponse.json(
        { error: 'Colis non trouvé', message: 'Ce code QR ne correspond à aucun colis.' },
        { status: 404 }
      );
    }

    if (baggage.status !== 'pending_activation') {
      return NextResponse.json(
        { error: 'Déjà activé', message: 'Ce colis a déjà été activé.' },
        { status: 400 }
      );
    }

    // Normalize fields: prefer new format, fall back to old format
    const firstName = data.travelerFirstName || data.senderName || '';
    const lastName = data.travelerLastName || '';
    const whatsapp = data.whatsappOwner || data.senderWhatsapp || '';
    const receiverName = data.receiverName || '';
    const receiverWhatsapp = data.receiverWhatsapp || '';
    const transportMode = data.transportMode || 'flight';
    const dest = data.destination || data.arrivalCity || '';
    const departDate = data.departureDate || '';

    // Calculate expiration
    const expiresAt = calculateExpirationDate('voyageur', 'sticker');

    // Build update data
    const updateData: Record<string, unknown> = {
      status: 'active',
      expiresAt,
    };

    if (firstName) updateData.travelerFirstName = firstName;
    if (lastName) updateData.travelerLastName = lastName;
    if (whatsapp) updateData.whatsappOwner = whatsapp;
    if (receiverName) updateData.receiverName = receiverName;
    if (receiverWhatsapp) updateData.receiverWhatsapp = receiverWhatsapp;
    updateData.transportMode = transportMode;

    // Transport-specific fields
    if (transportMode === 'flight') {
      if (data.airlineName || data.company) updateData.airlineName = data.airlineName || data.company;
      if (data.flightNumber) updateData.flightNumber = data.flightNumber;
    } else if (transportMode === 'train') {
      if (data.trainCompany || data.company) updateData.trainCompany = data.trainCompany || data.company;
      if (data.trainNumber) updateData.trainNumber = data.trainNumber;
    } else if (transportMode === 'boat') {
      if (data.shipName || data.company) updateData.shipName = data.shipName || data.company;
      if (data.shipCabin) updateData.shipCabin = data.shipCabin;
    } else if (transportMode === 'bus') {
      if (data.busCompany || data.company) {
        updateData.busCompany = data.busCompany || data.company;
        updateData.airlineName = data.busCompany || data.company; // fallback for display
      }
      if (data.busLineNumber) updateData.busLineNumber = data.busLineNumber;
    }

    if (dest) updateData.destination = dest;
    if (departDate) updateData.departureDate = new Date(departDate + 'T00:00:00');
    if (data.departureTime) updateData.departureTime = data.departureTime;

    // Update baggage
    const updatedBaggage = await db.baggage.update({
      where: { id: baggage.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      baggage: {
        id: updatedBaggage.id,
        reference: updatedBaggage.reference,
        type: updatedBaggage.type,
        status: updatedBaggage.status,
        expiresAt: updatedBaggage.expiresAt,
      },
      activation: {
        reference: updatedBaggage.reference,
        transportMode,
        firstName,
        lastName,
        whatsapp,
        destination: dest,
        departureDate: departDate,
        departureTime: data.departureTime || '',
      },
    });
  } catch (error) {
    console.error('Activation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', message: error.issues[0].message, details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur serveur', message: "Une erreur est survenue lors de l'activation." },
      { status: 500 }
    );
  }
}
