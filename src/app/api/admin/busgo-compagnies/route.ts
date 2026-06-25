import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { z } from 'zod';

/**
 * GET /api/admin/busgo-compagnies
 * Liste toutes les compagnies BusGo (agency avec au moins 1 user role=agent).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer toutes les agences
    const agencies = await db.agency.findMany({
      include: {
        users: {
          where: { role: { in: ['agent', 'admin'] } },
          select: { id: true, email: true, name: true, role: true, isActive: true },
        },
        _count: {
          select: { departures: true, passengerTickets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const compagnies = agencies.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      email: a.email,
      phone: a.phone,
      active: a.active,
      createdAt: a.createdAt.toISOString(),
      adminUser: a.users.find((u) => u.role === 'admin') || null,
      usersCount: a.users.length,
      departuresCount: a._count.departures,
      ticketsCount: a._count.passengerTickets,
    }));

    return NextResponse.json({ data: compagnies });
  } catch (error) {
    console.error('[API /api/admin/busgo-compagnies GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalide'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  address: z.string().optional(),
  adminName: z.string().min(1, 'Nom admin requis'),
  adminEmail: z.string().email('Email admin invalide'),
  adminPassword: z.string().min(8, 'Mot de passe min 8 caractères').optional(),
});

/**
 * POST /api/admin/busgo-compagnies
 * Crée une nouvelle compagnie BusGo.
 * - Crée l'Agency
 * - Crée un User admin pour cette agency
 * - Génère un mot de passe aléatoire si non fourni
 * - Retourne les identifiants pour l'admin de la compagnie
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, slug, email, phone, address, adminName, adminEmail, adminPassword } = parsed.data;

    // Vérifier slug unique
    const existingSlug = await db.agency.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 409 });
    }

    // Vérifier email admin unique
    const existingUser = await db.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'Cet email admin est déjà utilisé' }, { status: 409 });
    }

    // Générer mot de passe si non fourni
    const plainPassword = adminPassword || randomBytes(6).toString('hex');
    const hashedPassword = await hashPassword(plainPassword);

    // Transaction : Agency + User
    const agency = await db.agency.create({
      data: {
        name,
        slug,
        email,
        phone: phone || null,
        address: address || null,
        active: true,
      },
    });

    const admin = await db.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: 'admin',
        agencyId: agency.id,
        isActive: true,
      },
    });

    // Audit log
    await db.systemLog.create({
      data: {
        level: 'info',
        action: 'busgo_compagnie_created',
        message: `Compagnie BusGo "${name}" créée avec admin ${adminEmail}`,
        userId: session.id,
        tenantId: agency.id,
      },
    });

    return NextResponse.json({
      success: true,
      compagnie: {
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
        email: agency.email,
      },
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
      generatedPassword: plainPassword,
      busgoUrl: '/busgo',
    }, { status: 201 });
  } catch (error) {
    console.error('[API /api/admin/busgo-compagnies POST]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
