import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyEmailToken, verifyEmailCode } from '@/lib/email';
import { resetPasswordSchema, validateBody } from '@/lib/validation';
import { checkResetPasswordRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password
 *
 * Reset password with token or code.
 * - Zod validation (password min 8 chars + complexity)
 * - Rate limiting (3 attempts / hour per email)
 * - Invalidates ALL existing sessions after password change
 * - Uses bcrypt(10) for hashing
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

    const validation = validateBody(resetPasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { token, code, email, password } = validation.data;

    // Determine the email for rate limiting and verification
    const rateLimitEmail = email || 'unknown';
    const rateLimit = checkResetPasswordRateLimit(rateLimitEmail);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Trop de tentatives. Réessayez dans une heure.',
          retryAfterMs: rateLimit.resetInMs,
        },
        { status: 429 }
      );
    }

    let userEmail: string | null = null;

    // Verify via token
    if (token) {
      const result = await verifyEmailToken(token, 'password_reset');
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      userEmail = result.email || null;
    } else if (code && email) {
      // Verify via code + email
      const result = await verifyEmailCode(code, email, 'password_reset');
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      userEmail = email;
    } else {
      return NextResponse.json(
        { error: 'Token ou code requis' },
        { status: 400 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Impossible de vérifier l\'identité' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password + invalidate all sessions (SECURITY: force re-login)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete all sessions for this user — forces re-login after password change
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.',
    });
  } catch (error) {
    console.error('[auth/reset-password] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe' },
      { status: 500 }
    );
  }
}
