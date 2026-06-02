import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createEmailToken, sendEmail, getPasswordResetEmailTemplate } from '@/lib/email';
import { emailOnlySchema, validateBody } from '@/lib/validation';
import { checkForgotPasswordRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/forgot-password
 *
 * Request a password reset email.
 * - Zod validation on email
 * - Rate limiting (3 requests / hour per email)
 * - Anti-enumeration (same response whether user exists or not)
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

    const validation = validateBody(emailOnlySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { email } = validation.data;

    // Rate limiting
    const rateLimit = checkForgotPasswordRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Trop de demandes. Réessayez dans une heure.',
          retryAfterMs: rateLimit.resetInMs,
        },
        { status: 429 }
      );
    }

    // Anti-enumeration: check user existence
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe, un email de réinitialisation a été envoyé',
      });
    }

    // Create reset token + code
    const { token, code } = await createEmailToken(email, 'password_reset');

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const template = getPasswordResetEmailTemplate(
      user.name || 'Utilisateur',
      resetUrl,
      code
    );

    await sendEmail({
      to: email,
      subject: 'SmarticketS - Réinitialisation de votre mot de passe',
      html: template.html,
      text: template.text,
      type: 'password_reset',
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Si un compte existe, un email de réinitialisation a été envoyé',
    });
  } catch (error) {
    console.error('[auth/forgot-password] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}
