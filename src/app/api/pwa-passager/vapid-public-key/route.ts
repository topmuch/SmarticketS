import { NextResponse } from 'next/server';

/**
 * GET /api/pwa-passager/vapid-public-key
 *
 * Returns the VAPID public key for the frontend to pass to
 * pushManager.subscribe({ applicationServerKey: ... }).
 *
 * This is a PUBLIC endpoint (no auth) — the public key is safe to expose.
 * The private key is server-only and never sent to the client.
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID not configured', pushEnabled: false },
      { status: 503 }
    );
  }

  return NextResponse.json({
    publicKey,
    pushEnabled: true,
  });
}
