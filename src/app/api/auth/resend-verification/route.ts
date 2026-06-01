import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createEmailToken, sendEmail, getVerificationEmailTemplate } from '@/lib/email';
import { emailOnlySchema, validateBody } from '@/lib/validation';
import { checkForgotPasswordRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/resend-verification
 *
 * Resend verification email.
 * - Zod validation on email
 * - Rate limiting (3 requests / hour per email)
 * - Anti-enumeration pattern
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

    // Anti-enumeration
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe, un email de vérification a été envoyé',
      });
    }

    // Create new token
    const { token, code } = await createEmailToken(email, 'email_verification');

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    const template = getVerificationEmailTemplate(
      user.name || 'Utilisateur',
      verificationUrl,
      code
    );

    await sendEmail({
      to: email,
      subject: 'SmarticketS - Vérification de votre email',
      html: template.html,
      text: template.text,
      type: 'verification',
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Si un compte existe, un email de vérification a été envoyé',
    });
  } catch (error) {
    console.error('[auth/resend-verification] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}
