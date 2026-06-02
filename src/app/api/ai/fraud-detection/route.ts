import { NextRequest, NextResponse } from 'next/server';
import { detectFraud } from '@/lib/ai-services';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { baggageId, ipAddress, country } = body;

    if (!baggageId) {
      return NextResponse.json(
        { error: 'baggageId requis' },
        { status: 400 }
      );
    }

    const risk = await detectFraud(baggageId, ipAddress || null, country || null);

    return NextResponse.json({
      success: true,
      risk
    });
  } catch (error) {
    console.error('Fraud detection API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la détection de fraude' },
      { status: 500 }
    );
  }
}
