// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { updateStaffSchema } from "@/lib/schemas/admin";

// GET /api/admin/staff/[id] — Get staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");
    const { id } = await params;

    const staff = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        tenantId: true,
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      user.role !== "SUPER_ADMIN" &&
      user.tenantId !== staff.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(staff);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PUT /api/admin/staff/[id] — Update staff member (with anti-escalade guard)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");
    const { id } = await params;

    const body = await request.json();

    // ─── Zod validation ───
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validated = parsed.data;

    // ─── Fetch target user ───
    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, tenantId: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // ─── Tenant isolation: cannot modify users from another tenant ───
    if (user.role !== "SUPER_ADMIN" && user.tenantId !== target.tenantId) {
      return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
    }

    // 🔒 ANTI-ESCALADE: Prevent promotion to ADMIN or SUPER_ADMIN via this route
    // Only SUPER_ADMIN can create admins, and never via this endpoint
    if (validated.role && ["ADMIN", "SUPER_ADMIN"].includes(validated.role)) {
      return NextResponse.json(
        { error: "Impossible de promouvoir un utilisateur vers ce rôle via cette route" },
        { status: 403 }
      );
    }

    // 🔒 ANTI-ESCALADE: Prevent non-SUPER_ADMIN from modifying ADMIN/SUPER_ADMIN accounts
    if (
      ["SUPER_ADMIN", "ADMIN"].includes(target.role) &&
      user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Action non autorisée — vous ne pouvez pas modifier un compte administrateur" },
        { status: 403 }
      );
    }

    // Build update data from validated fields
    const updateData: Record<string, unknown> = {};
    if (validated.role !== undefined) updateData.role = validated.role;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
    if (validated.phone !== undefined) updateData.phone = validated.phone;

    // Handle password change
    if (validated.password) {
      updateData.password = await hashPassword(validated.password);
    }

    // Check email uniqueness if changed
    if (body.email && body.email !== undefined) {
      const existing = await db.user.findUnique({
        where: { id },
        select: { email: true, tenantId: true },
      });
      if (existing && body.email !== existing.email && existing.tenantId) {
        const emailConflict = await db.user.findUnique({
          where: {
            email_tenantId: {
              email: body.email,
              tenantId: existing.tenantId,
            },
          },
        });
        if (emailConflict) {
          return NextResponse.json(
            { error: "Un utilisateur avec cet email existe déjà" },
            { status: 409 }
          );
        }
        updateData.email = body.email;
      }
    }

    const staff = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    // Audit log with full change details
    await db.auditLog.create({
      data: {
        action: "UPDATE_STAFF",
        entity: "User",
        entityId: id,
        userId: user.userId,
        tenantId: target.tenantId,
        details: JSON.stringify({
          changes: validated,
        }),
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation échouée", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/admin/staff/[id] — Deactivate staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");
    const { id } = await params;

    // Prevent self-deletion
    if (id === user.userId) {
      return NextResponse.json(
        { error: "Cannot deactivate yourself" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      user.role !== "SUPER_ADMIN" &&
      user.tenantId !== existing.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 🔒 Prevent deactivating ADMIN/SUPER_ADMIN unless you are SUPER_ADMIN
    if (
      ["SUPER_ADMIN", "ADMIN"].includes(existing.role) &&
      user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Action non autorisée — vous ne pouvez pas désactiver un compte administrateur" },
        { status: 403 }
      );
    }

    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        action: "DEACTIVATE_STAFF",
        entity: "User",
        entityId: id,
        userId: user.userId,
        tenantId: existing.tenantId,
        details: JSON.stringify({
          deactivatedUser: existing.email,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
