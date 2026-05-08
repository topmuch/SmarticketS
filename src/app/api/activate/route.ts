import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateExpirationDate } from '@/lib/qr';
import { z } from 'zod';

// Validation schema for activation
const activateSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  travelerFirstName: z.string().min(1, 'First name is required'),
  travelerLastName: z.string().min(1, 'Last name is required'),
  whatsappOwner: z.string().min(1, 'WhatsApp number is required'),
  flightNumber: z.string().optional(),
  destination: z.string().optional(),
  departureDate: z.string().date().optional(),
  departureTime: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = activateSchema.parse(body);

    // Find the baggage by reference
    const baggage = await db.baggage.findUnique({
      where: { reference: validatedData.reference },
      include: { agency: true }
    });

    if (!baggage) {
      return NextResponse.json(
        { error: 'Baggage not found', message: 'Code QR non valide' },
        { status: 404 }
      );
    }

    if (baggage.status !== 'pending_activation') {
      return NextResponse.json(
        { error: 'Already activated', message: 'Ce bagage a déjà été activé' },
        { status: 400 }
      );
    }

    // Determine subtype for expiration calculation
    const subtype = baggage.type === 'voyageur' ? 'sticker' : undefined;

    // Calculate expiration date
    const expiresAt = calculateExpirationDate(baggage.type as 'hajj' | 'voyageur', subtype);

    // Update baggage with traveler info
    const updatedBaggage = await db.baggage.update({
      where: { id: baggage.id },
      data: {
        travelerFirstName: validatedData.travelerFirstName,
        travelerLastName: validatedData.travelerLastName,
        whatsappOwner: validatedData.whatsappOwner,
        flightNumber: validatedData.flightNumber || null,
        destination: validatedData.destination || null,
        departureDate: validatedData.departureDate ? new Date(validatedData.departureDate + 'T00:00:00') : null,
        departureTime: validatedData.departureTime || null,
        status: 'active',
        expiresAt,
        createdAt: new Date(),
      }
    });

    // If this is part of a group (Hajj has 3 bags), activate all related baggages
    if (baggage.type === 'hajj' && baggage.agencyId) {
      // Find all baggages with same agency and same reference prefix (first 6 chars)
      const prefix = baggage.reference.substring(0, 6);
      const relatedBaggages = await db.baggage.findMany({
        where: {
          reference: { startsWith: prefix },
          agencyId: baggage.agencyId,
          status: 'pending_activation'
        }
      });

      // Activate all related baggages
      for (const related of relatedBaggages) {
        if (related.id !== baggage.id) {
          await db.baggage.update({
            where: { id: related.id },
            data: {
              travelerFirstName: validatedData.travelerFirstName,
              travelerLastName: validatedData.travelerLastName,
              whatsappOwner: validatedData.whatsappOwner,
              departureDate: validatedData.departureDate ? new Date(validatedData.departureDate + 'T00:00:00') : null,
              departureTime: validatedData.departureTime || null,
              flightNumber: validatedData.flightNumber || null,
              destination: validatedData.destination || null,
              status: 'active',
              expiresAt,
              createdAt: new Date(),
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      baggage: {
        id: updatedBaggage.id,
        reference: updatedBaggage.reference,
        type: updatedBaggage.type,
        status: updatedBaggage.status,
        expiresAt: updatedBaggage.expiresAt,
      }
    });

  } catch (error) {
    console.error('Activation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
