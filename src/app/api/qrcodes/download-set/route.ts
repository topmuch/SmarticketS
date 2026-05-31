import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import QRCode from 'qrcode';
import JSZip from 'jszip';

// POST - Download all QR codes in a set as a ZIP file (individual PNG files)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { setId, format = 'png' } = body;

    if (!setId) {
      return NextResponse.json(
        { error: 'Set ID requis' },
        { status: 400 }
      );
    }

    // Fetch all baggages in this set
    const baggages = await db.baggage.findMany({
      where: {
        OR: [
          { setId: setId },
          { reference: { startsWith: `${setId}-` } },
        ],
      },
      orderBy: { baggageIndex: 'asc' },
    });

    if (baggages.length === 0) {
      return NextResponse.json(
        { error: 'Set introuvable', setId },
        { status: 404 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://smartickets.com';
    const isHajj = baggages[0].type === 'hajj';
    const fgColor = isHajj ? '#059669' : '#d35400';

    // Generate QR codes as PNG buffers
    const zip = new JSZip();
    const folderName = `SmarticketS-${setId}`;
    const folder = zip.folder(folderName);

    if (!folder) {
      return NextResponse.json(
        { error: 'Erreur de création ZIP' },
        { status: 500 }
      );
    }

    for (const baggage of baggages) {
      const qrUrl = `${origin}/scan/${baggage.reference}`;
      const label = baggage.baggageType === 'cabine'
        ? `CABINE`
        : `SOUTE-${String(baggage.baggageIndex).padStart(2, '0')}`;

      // Generate QR as PNG buffer (400x400)
      const pngBuffer = await QRCode.toBuffer(qrUrl, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: fgColor,
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      // For JPG, we'd need to convert, but PNG is universal and smaller for QR
      const ext = format === 'jpg' ? 'png' : 'png'; // Always PNG for quality
      const filename = `${label}_${baggage.reference}.${ext}`;
      folder.file(filename, pngBuffer);
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folderName}.zip"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Download set error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
