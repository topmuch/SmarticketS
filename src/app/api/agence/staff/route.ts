/**
 * Staff CRUD API — /api/agence/staff
 *
 * GET    → List all staff for an agency (with filters: role, active)
 * POST   → Create a new staff member (generates 4-digit login code)
 * PATCH  → Update staff member (name, role, permissions, isActive)
 * DELETE → Soft-delete (deactivate) staff member
 *
 * All routes require agencyId parameter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  ROLE_PERMISSIONS,
  parsePermissions,
  serializePermissions,
  ROLES,
  PERMISSIONS,
} from '@/lib/rbac';
import { normalizePhone, isValidPhoneFormat } from '@/lib/whatsapp';
import { z } from 'zod';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';

// ─── Validation Schemas ──────────────────────────────────────────────

const createStaffSchema = z.object({
  agencyId: z.string().min(1, 'agencyId est requis'),
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
});

const updateStaffSchema = z.object({
  id: z.string().min(1, 'id est requis'),
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

const deleteStaffSchema = z.object({
  id: z.string().min(1, 'id est requis'),
});

// ─── GET: List Staff ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json(
        { success: false, error: 'agencyId est requis' },
        { status: 400 }
      );
    }

    // Build filters
    const where: Record<string, unknown> = { agencyId };

    // Filter by role
    const role = searchParams.get('role');
    if (role && Object.values(ROLES).includes(role as typeof ROLES[keyof typeof ROLES])) {
      where.role = role;
    }

    // Filter by active status
    const active = searchParams.get('active');
    if (active !== null && active !== undefined) {
      where.isActive = active === 'true';
    }

    const staff = await db.staff.findMany({
      where,
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
        _count: {
          select: { auditLogs: true },
        },
        // NEVER expose loginCodeHash
      },
    });

    // Parse permissions from JSON for each staff member
    const staffWithParsedPerms = staff.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      role: s.role,
      permissions: parsePermissions(s.permissions),
      isActive: s.isActive,
      hasActivated: s.hasActivated,
      lastLogin: s.lastLogin,
      codeExpiresAt: s.codeExpiresAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      auditLogsCount: s._count.auditLogs,
    }));

    return NextResponse.json({ success: true, staff: staffWithParsedPerms });
  } catch (error) {
    console.error('[Staff GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ─── POST: Create Staff ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Parse and validate body
    const body = await req.json();
    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { agencyId, name, phone: rawPhone, role, permissions: customPerms } = parsed.data;

    // Verify agency exists
    const agency = await db.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      return NextResponse.json(
        { success: false, error: 'Agence non trouvée' },
        { status: 404 }
      );
    }

    // Normalize phone to E.164
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Numéro de téléphone invalide' },
        { status: 400 }
      );
    }

    // Check for duplicate phone
    const existing = await db.staff.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ce numéro de téléphone est déjà enregistré' },
        { status: 409 }
      );
    }

    // Generate 4-digit code with crypto.randomInt
    const plainCode = randomInt(1000, 9999).toString();
    const codeHash = await bcrypt.hash(plainCode, 10);
    const codeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Determine permissions: use custom if provided, else defaults for the role
    const permissions = customPerms && customPerms.length > 0
      ? customPerms
      : ROLE_PERMISSIONS[role];

    // Create staff member
    const staff = await db.staff.create({
      data: {
        name,
        phone,
        role,
        permissions: serializePermissions(permissions),
        loginCodeHash: codeHash,
        codeExpiresAt,
        agencyId,
      },
    });

    // Create audit log
    await db.staffAuditLog.create({
      data: {
        action: 'STAFF_CREATED' as const,
        staffId: staff.id,
        details: JSON.stringify({ name, phone, role, permissions }),
      },
    });

    // Return staff data + the plain code (ONE TIME ONLY)
    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        permissions: parsePermissions(staff.permissions),
        isActive: staff.isActive,
        hasActivated: staff.hasActivated,
        codeExpiresAt: staff.codeExpiresAt,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      },
      plainCode,
    }, { status: 201 });
  } catch (error) {
    console.error('[Staff POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update Staff ────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, name, role, permissions: customPerms, isActive } = parsed.data;

    // Check staff exists
    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Membre non trouvé' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;

    // If role changes, update permissions to new role defaults
    if (role !== undefined) {
      updateData.role = role;
      if (!customPerms) {
        updateData.permissions = serializePermissions(ROLE_PERMISSIONS[role]);
      }
    }

    if (customPerms) {
      updateData.permissions = serializePermissions(customPerms);
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update staff
    const updated = await db.staff.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.staffAuditLog.create({
      data: {
        action: 'STAFF_UPDATED' as const,
        staffId: id,
        details: JSON.stringify({ name, role, permissions: customPerms, isActive }),
      },
    });

    return NextResponse.json({
      success: true,
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
    console.error('[Staff PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Deactivate Staff (Soft Delete) ───────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = deleteStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    // Check staff exists
    const existing = await db.staff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Membre non trouvé' },
        { status: 404 }
      );
    }

    // Soft delete: deactivate
    await db.staff.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    // Create audit log
    await db.staffAuditLog.create({
      data: {
        action: 'STAFF_DEACTIVATED' as const,
        staffId: id,
        details: JSON.stringify({ name: existing.name, phone: existing.phone }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Membre désactivé avec succès',
    });
  } catch (error) {
    console.error('[Staff DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
