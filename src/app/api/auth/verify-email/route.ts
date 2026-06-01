import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyEmailToken, verifyEmailCode } from '@/lib/email';
import { verifyEmailSchema, validateBody } from '@/lib/validation';
import { checkVerifyEmailRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/verify-email
 *
 * Verify email with token or 6-digit code.
 * - Zod validation (token XOR code+email)
 * - Rate limiting (5 attempts / 15 min per email)
 * - Persists emailVerified timestamp in DB
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide' },
        { status: 400 }
      );
    }

    const validation = validateBody(verifyEmailSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { token, code, email } = validation.data;

    // Rate limiting
    if (email) {
      const rateLimit = checkVerifyEmailRateLimit(email);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Trop de tentatives. Réessayez dans quelques minutes.',
            retryAfterMs: rateLimit.resetInMs,
          },
          { status: 429 }
        );
      }
    }

    // Verify with token
    if (token) {
      const result = await verifyEmailToken(token, 'email_verification');
      if (!result.valid) {
        return NextResponse.json(
          { error: result.error || 'Token invalide ou expiré' },
          { status: 400 }
        );
      }

      // Persist email verification status
      await prisma.user.update({
        where: { email: result.email },
        data: { emailVerified: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Email vérifié avec succès',
        email: result.email,
      });
    }

    // Verify with code + email
    if (code && email) {
      const result = await verifyEmailCode(code, email, 'email_verification');
      if (!result.valid) {
        return NextResponse.json(
          { error: result.error || 'Code invalide ou expiré' },
          { status: 400 }
        );
      }

      // Persist email verification status
      await prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Email vérifié avec succès',
      });
    }

    return NextResponse.json(
      { error: 'Token ou code requis' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[auth/verify-email] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
