import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/busgo/equipe
 * Liste les utilisateurs de l'agence.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let agencyId = session.agencyId;
    if (!agencyId) {
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) return NextResponse.json({ error: 'Aucune agence' }, { status: 400 });
      agencyId = firstAgency.id;
    }

    const members = await db.user.findMany({
      where: { agencyId, role: { in: ['agent', 'controller', 'admin'] } },
      select: { id: true, email: true, name: true, role: true, isActive: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error('[API /api/busgo/equipe GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// FIX (audit #5): Zod validation for member creation
const createMemberSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Mot de passe requis (min 8 caractères)'),
  role: z.enum(['agent', 'controller'], { errorMap: () => ({ message: 'Rôle invalide (agent ou controller)' }) }),
});

/**
 * POST /api/busgo/equipe
 * Crée un guichetier ou contrôleur.
 *
 * FIX (audit #5): previously any authenticated user (incl. agent) could create
 * team members. Now requires admin/superadmin role + Zod validation + rate limiting.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // FIX (audit #5): RBAC — only admin/superadmin can create team members
    if (!['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé — réservé aux admins' }, { status: 403 });
    }

    // Rate limit: 10 members / hour per admin
    const { allowed } = rateLimit(`create-member:${session.userId}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Trop de créations. Réessayez dans 1h.' }, { status: 429 });
    }

    let agencyId = session.agencyId;
    if (!agencyId) {
      if (session.role !== 'superadmin') {
        return NextResponse.json({ error: 'Aucune agence associée' }, { status: 403 });
      }
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) return NextResponse.json({ error: 'Aucune agence trouvée' }, { status: 400 });
      agencyId = firstAgency.id;
    }

    const body = await request.json();
    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password, role } = parsed.data;

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
        agencyId,
        isActive: true,
      },
    });

    // FIX (audit #5): audit log
    try {
      await db.auditLog.create({
        data: {
          action: 'CREATE_TEAM_MEMBER',
          entity: 'User',
          entityId: user.id,
          userId: session.userId,
          details: `Created ${role} "${name}" (${email})`,
        },
      });
    } catch {
      // Audit log failure is non-fatal
    }

    return NextResponse.json({
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    }, { status: 201 });
  } catch (error) {
    console.error('[API /api/busgo/equipe POST]', error);
    // FIX (audit W11): don't leak server internals
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/busgo/equipe?id=xxx
 * Active/désactive un utilisateur.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let agencyId = session.agencyId;
    if (!agencyId) {
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) return NextResponse.json({ error: 'Aucune agence' }, { status: 400 });
      agencyId = firstAgency.id;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    if (!userId) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const body = await request.json();
    const { isActive } = body as { isActive: boolean };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.agencyId !== agencyId) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    await db.user.update({ where: { id: userId }, data: { isActive } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/busgo/equipe PATCH]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/busgo/equipe?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    let agencyId = session.agencyId;
    if (!agencyId) {
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) return NextResponse.json({ error: 'Aucune agence' }, { status: 400 });
      agencyId = firstAgency.id;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    if (!userId) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.agencyId !== agencyId) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    await db.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/busgo/equipe DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
