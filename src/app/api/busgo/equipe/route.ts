import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

/**
 * GET /api/busgo/equipe
 * Liste les utilisateurs de l'agence (guichetiers + contrôleurs).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const members = await db.user.findMany({
      where: {
        agencyId: session.agencyId,
        role: { in: ['agent', 'controller', 'admin'] },
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error('[API /api/busgo/equipe GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/busgo/equipe
 * Crée un guichetier ou contrôleur.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, password, role } = body as {
      name: string; email: string; phone?: string; password: string; role: string;
    };

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    if (!['agent', 'controller'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide (agent ou controller)' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        phone: phone || null,
        password: hashedPassword,
        role,
        agencyId: session.agencyId,
        isActive: true,
      },
    });

    return NextResponse.json({
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    }, { status: 201 });
  } catch (error) {
    console.error('[API /api/busgo/equipe POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/busgo/equipe?id=xxx
 * Active/désactive un utilisateur.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    if (!userId) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const body = await request.json();
    const { isActive } = body as { isActive: boolean };

    // Vérifier que l'utilisateur appartient à l'agence
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    await db.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/busgo/equipe PATCH]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
