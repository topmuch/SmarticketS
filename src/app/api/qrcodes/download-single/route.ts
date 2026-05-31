import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import QRCode from 'qrcode';

// POST - Download a single QR code as PNG
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, format = 'png', size = 600 } = body;

    if (!reference) {
      return NextResponse.json(
        { error: 'Référence requise' },
        { status: 400 }
      );
    }

    // Fetch the baggage
    const baggage = await db.baggage.findUnique({
      where: { reference: reference.toUpperCase().trim() },
    });

    if (!baggage) {
      return NextResponse.json(
        { error: 'QR code introuvable', reference },
        { status: 404 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://smartickets.com';
    const qrUrl = `${origin}/scan/${baggage.reference}`;
    const isHajj = baggage.type === 'hajj';
    const fgColor = isHajj ? '#059669' : '#d35400';

    // Generate QR as PNG
    const pngBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      width: size,
      margin: 2,
      color: {
        dark: fgColor,
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    const label = baggage.baggageType === 'cabine'
      ? `CABINE`
      : `SOUTE-${String(baggage.baggageIndex).padStart(2, '0')}`;
    const filename = `${label}_${baggage.reference}.png`;

    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Download single QR error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
