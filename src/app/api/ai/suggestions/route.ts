import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getQRSuggestion, getGlobalQRSuggestion, getAIStatus } from '@/lib/ai-services';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');
    const global = searchParams.get('global');
    const status = searchParams.get('status');

    // Get AI status
    if (status === 'true') {
      const aiStatus = await getAIStatus();
      return NextResponse.json({
        success: true,
        aiStatus
      });
    }

    // Get global suggestion
    if (global === 'true') {
      const suggestion = await getGlobalQRSuggestion();
      return NextResponse.json({
        success: true,
        suggestion
      });
    }

    // Get agency-specific suggestion
    if (agencyId) {
      const suggestion = await getQRSuggestion(agencyId);
      return NextResponse.json({
        success: true,
        suggestion
      });
    }

    // Default: return global suggestion
    const suggestion = await getGlobalQRSuggestion();
    return NextResponse.json({
      success: true,
      suggestion
    });
  } catch (error) {
    console.error('QR Suggestion API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suggestion' },
      { status: 500 }
    );
  }
}
