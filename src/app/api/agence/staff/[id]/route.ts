/**
 * Staff Individual API — /api/agence/staff/[id]
 *
 * GET    → Get a single staff member
 * PUT    → Update staff member (name, role, permissions, status)
 * DELETE → Soft-delete (deactivate) a staff member
 * POST   → Reset login code (generates new code, invalidates old one)
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
import { z } from 'zod';

// ─── Validation Schema ────────────────────────────────────────────────

const updateStaffSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum([ROLES.ADMIN, ROLES.OPERATOR, ROLES.CONTROLLER, ROLES.DRIVER]).optional(),
  permissions: z.array(z.enum([
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.ACTIVATE_TICKETS,
    PERMISSIONS.ACTIVATE_PARCELS,
    PERMISSIONS.VALIDATE_TICKETS,
    PERMISSIONS.MANAGE_DELIVERIES,
    PERMISSIONS.VIEW_ANALYTICS,
  ])).optional(),
  isActive: z.boolean().optional(),
});

// ─── Route Segment Params ──────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET: Single Staff Member ───────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSession();
    if (!user || !user.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const staff = await db.staff.findFirst({
      where: { id, agencyId: user.agencyId },
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
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      staff: {
        ...staff,
        permissions: parsePermissions(staff.permissions),
        hasValidCode: staff.codeExpiresAt ? new Date(staff.codeExpiresAt) > new Date() : false,
      },
    });
  } catch (error) {
    console.error('[Staff GET/:id] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── PUT: Update Staff Member ──────────────────────────────────────

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSession();
    if (!user || !user.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check staff exists and belongs to this agency
    const existing = await db.staff.findFirst({
      where: { id, agencyId: user.agencyId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    // If role changed and no custom permissions, apply defaults for new role
    let permissionsData: string[] | undefined;
    if (parsed.data.role && !parsed.data.permissions) {
      permissionsData = DEFAULT_PERMISSIONS[parsed.data.role];
    } else if (parsed.data.permissions) {
      permissionsData = parsed.data.permissions;
    }

    // Determine audit action
    let auditAction = 'STAFF_UPDATED' as const;
    if (parsed.data.isActive === false) auditAction = 'STAFF_DEACTIVATED' as const;
    if (parsed.data.isActive === true && !existing.isActive) auditAction = 'STAFF_REACTIVATED' as const;

    // Update staff
    const updated = await db.staff.update({
      where: { id },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.role && { role: parsed.data.role }),
        ...(permissionsData && { permissions: serializePermissions(permissionsData) }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      },
    });

    // Create audit log
    await db.staffAuditLog.create({
      data: {
        action: auditAction,
        staffId: id,
        actorId: user.id,
        details: JSON.stringify(parsed.data),
      },
    });

    return NextResponse.json({
      staff: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        role: updated.role,
        permissions: parsePermissions(updated.permissions),
        isActive: updated.isActive,
        hasActivated: updated.hasActivated,
        lastLogin: updated.lastLogin,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Staff PUT/:id] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── DELETE: Deactivate Staff ───────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSession();
    if (!user || !user.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.staff.findFirst({
      where: { id, agencyId: user.agencyId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    // Soft delete: deactivate + clear credentials
    await db.staff.update({
      where: { id },
      data: {
        isActive: false,
        loginCodeHash: null,
        codeExpiresAt: null,
        hasActivated: false,
      },
    });

    // Audit log
    await db.staffAuditLog.create({
      data: {
        action: 'STAFF_DELETED' as const,
        staffId: id,
        actorId: user.id,
        details: JSON.stringify({ name: existing.name, phone: existing.phone }),
      },
    });

    return NextResponse.json({ message: 'Membre supprimé avec succès' });
  } catch (error) {
    console.error('[Staff DELETE/:id] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST (reset-code): Reset Login Code ───────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSession();
    if (!user || !user.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    // Check this is a reset request (body contains action)
    const body = await req.json();
    if (body.action !== 'reset-code') {
      return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    }

    // Find staff member
    const existing = await db.staff.findFirst({
      where: { id, agencyId: user.agencyId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    // Generate new code (async bcrypt)
    const { plain: code, hash: codeHash } = await generateSecureCode();
    const codeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update staff with new code, reset activation
    await db.staff.update({
      where: { id },
      data: {
        loginCodeHash: codeHash,
        codeExpiresAt,
        hasActivated: false,
        isActive: true,
      },
    });

    // Audit log
    await db.staffAuditLog.create({
      data: {
        action: 'CODE_RESET' as const,
        staffId: id,
        actorId: user.id,
        details: JSON.stringify({ codeGenerated: true, expiresAt: codeExpiresAt }),
      },
    });

    // Return the new code (ONE TIME ONLY)
    return NextResponse.json({
      code,
      codeExpiresAt,
      message: `Code réinitialisé. Nouveau code : ${code}`,
    });
  } catch (error) {
    console.error('[Staff POST/:id reset-code] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
