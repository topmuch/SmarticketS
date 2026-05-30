/**
 * Staff CRUD API — /api/agence/staff
 *
 * GET    → List all staff for the authenticated agency
 * POST   → Create a new staff member (generates login code)
 *
 * Requires agency session authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateSecureCode } from '@/lib/secure-code';
import {
  DEFAULT_PERMISSIONS,
  parsePermissions,
  serializePermissions,
  ROLES,
  PERMISSIONS,
} from '@/lib/rbac';
import { normalizePhone, isValidPhoneFormat } from '@/lib/whatsapp';
import { z } from 'zod';

// ─── Validation Schemas ──────────────────────────────────────────────

const createStaffSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  phone: z.string().refine(isValidPhoneFormat, 'Format téléphone invalide (ex: +221771234567)'),
  role: z.enum([ROLES.ADMIN, ROLES.OPERATOR, ROLES.CONTROLLER, ROLES.DRIVER]).default(ROLES.OPERATOR),
  permissions: z.array(z.enum([
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.ACTIVATE_TICKETS,
    PERMISSIONS.ACTIVATE_PARCELS,
    PERMISSIONS.VALIDATE_TICKETS,
    PERMISSIONS.MANAGE_DELIVERIES,
    PERMISSIONS.VIEW_ANALYTICS,
  ])).optional(),
  isActive: z.boolean().default(true),
});

// ─── GET: List Staff ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    // Verify agency session
    const user = await getSession();
    if (!user || !user.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get('agencyId') || user.agencyId;

    // Security: can only view staff from own agency
    if (agencyId !== user.agencyId && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const staff = await db.staff.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        hasActivated: true,
        lastLogin: true,
        codeExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        // NEVER expose loginCodeHash
      },
    });

    // Parse permissions from JSON for each staff member
    const staffWithParsedPerms = staff.map((s) => ({
      ...s,
      permissions: parsePermissions(s.permissions),
      hasValidCode: s.codeExpiresAt ? new Date(s.codeExpiresAt) > new Date() : false,
    }));

    return NextResponse.json({ staff: staffWithParsedPerms });
  } catch (error) {
    console.error('[Staff GET] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST: Create Staff ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Verify agency session
    const user = await getSession();
    if (!user || !user.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Parse and validate body
    const body = await req.json();
    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, phone: rawPhone, role, permissions: customPerms, isActive } = parsed.data;

    // Normalize phone to E.164
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 });
    }

    // Check for duplicate phone within the same agency
    const existing = await db.staff.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà enregistré' },
        { status: 409 }
      );
    }

    // Generate secure login code
    const { plain: code, hash: codeHash } = generateSecureCode();
    const codeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Determine permissions: use custom if provided, else defaults for the role
    const permissions = customPerms && customPerms.length > 0
      ? customPerms
      : DEFAULT_PERMISSIONS[role];

    // Create staff member
    const staff = await db.staff.create({
      data: {
        name,
        phone,
        role,
        permissions: serializePermissions(permissions),
        loginCodeHash: codeHash,
        codeExpiresAt,
        isActive,
        agencyId: user.agencyId,
      },
    });

    // Create audit log
    await db.staffAuditLog.create({
      data: {
        action: 'STAFF_CREATED' as const,
        staffId: staff.id,
        actorId: user.id,
        details: JSON.stringify({ name, phone, role, permissions }),
      },
    });

    // Return staff data + the plain code (ONE TIME ONLY)
    return NextResponse.json({
      staff: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        permissions: parsePermissions(staff.permissions),
        isActive: staff.isActive,
        code,
        codeExpiresAt: staff.codeExpiresAt,
        createdAt: staff.createdAt,
      },
      message: `Membre créé avec succès. Code d'accès : ${code}`,
    }, { status: 201 });
  } catch (error) {
    console.error('[Staff POST] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
