/**
 * API: POST /api/pwa/generate-token
 *
 * Generates a short-lived JWT-like token for PWA routes.
 * Requires valid agency session. The token binds the PWA URL
 * to the requesting agency for 24 hours.
 *
 * Request body:
 *   { role: 'controller' | 'driver' }
 *
 * Response:
 *   { token: string, url: string, agencyId: string, agencyName: string, role: string, expiresAt: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generatePwaToken } from '@/lib/pwa-guard';

// Token roles allowed
const ALLOWED_ROLES = ['controller', 'driver'] as const;

// PWA route mapping
const PWA_ROUTES: Record<string, string> = {
  controller: '/controller/validate',
  driver: '/driver/deliveries',
};

export async function POST(request: NextRequest) {
  try {
    // ─── Auth check: require valid agency session ──────────────────
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 },
      );
    }

    if (!session.agencyId) {
      return NextResponse.json(
        { error: 'Aucune agence associée à ce compte' },
        { status: 403 },
      );
    }

    // ─── Parse request body ─────────────────────────────────────────
    let body: { role?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide' },
        { status: 400 },
      );
    }

    const role = body?.role?.toLowerCase();

    if (!role || !ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
      return NextResponse.json(
        { error: `Rôle invalide. Valeurs acceptées : ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 },
      );
    }

    // ─── Generate token ───────────────────────────────────────────
    const token = await generatePwaToken(
      session.agencyId,
      session.agency?.name || session.name || 'Agence',
      role as 'controller' | 'driver',
    );

    // ─── Build URL ─────────────────────────────────────────────────
    const basePath = PWA_ROUTES[role];
    const origin = request.headers.get('origin') || '';
    const pwaUrl = `${origin}${basePath}?token=${encodeURIComponent(token)}`;

    // ─── Calculate expiry ───────────────────────────────────────────
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      token,
      url: pwaUrl,
      agencyId: session.agencyId,
      agencyName: session.agency?.name || session.name || 'Agence',
      role,
      expiresAt,
    });
  } catch (error) {
    console.error('[PWA Token] Error generating token:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la génération du token' },
      { status: 500 },
    );
  }
}
