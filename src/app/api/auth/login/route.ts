import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession, logLoginAttempt, deleteSession } from '@/lib/session';
import { loginSchema, validateBody } from '@/lib/validation';
import { checkLoginRateLimit, checkIpRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login
 *
 * Authenticated login with:
 * - Zod validation (email format, password min 8 chars)
 * - Rate limiting (5 attempts / 15 min per email, 20/min per IP)
 * - bcrypt password verification
 * - Session creation (HttpOnly cookie)
 * - Audit logging on every attempt
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide' },
        { status: 400 }
      );
    }

    // 2. Validate with Zod
    const validation = validateBody(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { email, password, role } = validation.data;

    // 3. Rate limiting — per email
    const emailRateLimit = checkLoginRateLimit(email);
    if (!emailRateLimit.allowed) {
      await logLoginAttempt({
        email,
        success: false,
        failureReason: 'Rate limit atteint',
      });
      return NextResponse.json(
        {
          error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
          retryAfterMs: emailRateLimit.resetInMs,
        },
        { status: 429 }
      );
    }

    // 4. Rate limiting — per IP
    const headersList = await headers();
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip') || 'unknown';
    const ipRateLimit = checkIpRateLimit(clientIp);
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez plus tard.' },
        { status: 429 }
      );
    }

    // 5. Lookup user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { agency: true },
    });

    if (!user) {
      await logLoginAttempt({
        email,
        success: false,
        failureReason: 'Utilisateur non trouvé',
      });
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    // 6. Verify password
    const isValidPassword = user.password
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isValidPassword) {
      await logLoginAttempt({
        userId: user.id,
        email,
        success: false,
        failureReason: 'Mot de passe incorrect',
      });
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    // 7. Role-based access check
    // FIX: previously, role === 'admin' was rejected unless user was superadmin.
    // This blocked BusGo admins (role='admin') from logging in via /busgo/connexion.
    // Now: role='admin' accepts admin + superadmin; role='superadmin' accepts only superadmin.
    if (role === 'superadmin' && user.role !== 'superadmin') {
      await logLoginAttempt({
        userId: user.id,
        email,
        success: false,
        failureReason: 'Accès superadmin non autorisé',
      });
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // role='admin' accepts admin, superadmin (and agent for BusGo)
    if (role === 'admin' && !['admin', 'superadmin', 'agent'].includes(user.role)) {
      await logLoginAttempt({
        userId: user.id,
        email,
        success: false,
        failureReason: 'Accès admin non autorisé',
      });
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    if (role === 'agency' && user.role !== 'agency' && user.role !== 'superadmin') {
      await logLoginAttempt({
        userId: user.id,
        email,
        success: false,
        failureReason: 'Accès agence non autorisé',
      });
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // 8. Create session
    await createSession(user.id);

    // 9. Log success
    await logLoginAttempt({
      userId: user.id,
      email,
      success: true,
    });

    // 10. Return user info (never password)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
        agency: user.agency,
      },
      redirectUrl:
        user.role === 'superadmin'
          ? '/admin/tableau-de-bord'
          : '/agence/tableau-de-bord',
    });
  } catch (error) {
    console.error('[auth/login] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
