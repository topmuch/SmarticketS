import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { summarizeText, extractPartnerInfo } from '@/lib/ai-services';

export async function POST(request: NextRequest) {
  try {
    // 🔒 AUTH AJOUTÉE — Vérification authentification + rôle
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    const allowedRoles = ['admin', 'agent', 'agency', 'superadmin'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle insuffisant' },
        { status: 403 }
      );
    }
    // 🔒 FIN AUTH

    const body = await request.json();
    const { text, maxLength, extractInfo } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'text requis' },
        { status: 400 }
      );
    }

    if (extractInfo) {
      const result = await extractPartnerInfo(text);
      return NextResponse.json({
        success: true,
        ...result
      });
    }

    const result = await summarizeText(text, maxLength || 100);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Summarization API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du résumé' },
      { status: 500 }
    );
  }
}
