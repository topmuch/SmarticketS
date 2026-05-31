import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession, deleteSession, logLoginAttempt } from '@/lib/session';

const DRIVER_COOKIE_NAME = 'smartickets_driver_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// ─── POST: Driver Login ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 },
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
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
        { status: 401 },
      );
    }

    // Check password
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
        { status: 401 },
      );
    }

    // Check role: allow "agent" and "driver" roles
    if (user.role !== 'agent' && user.role !== 'agency' && user.role !== 'driver') {
      await logLoginAttempt({
        userId: user.id,
        email,
        success: false,
        failureReason: 'Rôle chauffeur non autorisé',
      });
      return NextResponse.json(
        { error: 'Accès non autorisé pour le rôle chauffeur' },
        { status: 403 },
      );
    }

    // Create session with driver cookie
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const session = await db.session.create({
      data: {
        userId: user.id,
        expiresAt,
        userAgent: request.headers.get('user-agent') || null,
        lastActivity: new Date(),
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
      },
    });

    response.cookies.set(DRIVER_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    await logLoginAttempt({
      userId: user.id,
      email,
      success: true,
    });

    return response;
  } catch (error) {
    console.error('Driver login error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}

// ─── DELETE: Driver Logout ───────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(DRIVER_COOKIE_NAME)?.value;

    if (sessionId) {
      await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete(DRIVER_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error('Driver logout error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
