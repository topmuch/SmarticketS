import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser, requireRole, requireTenantAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR", "CONTROLLER", "DRIVER"]).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/users/:id - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    const { id } = await params;

    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // SUPER_ADMIN can update anyone; tenant users need ADMIN role and same tenant
    if (payload.role !== "SUPER_ADMIN") {
      if (!targetUser.tenantId || !payload.tenantId) {
        return forbiddenResponse("Cannot update users outside your tenant");
      }
      requireTenantAccess(payload, targetUser.tenantId);
      requireRole(payload, "SUPER_ADMIN", "ADMIN");
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Non-SUPER_ADMIN cannot set role to SUPER_ADMIN
    if (payload.role !== "SUPER_ADMIN" && data.role === "SUPER_ADMIN") {
      return forbiddenResponse("Cannot assign SUPER_ADMIN role");
    }

    // Prevent deactivating self
    if (payload.userId === id && data.isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        tenantId: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAudit({
      action: "UPDATE",
      entity: "User",
      entityId: id,
      details: data,
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && (error.message.includes("Insufficient") || error.message.includes("access") || error.message.includes("Cannot"))) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/users/:id - Soft delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    const { id } = await params;

    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // SUPER_ADMIN can delete anyone; tenant users need ADMIN role and same tenant
    if (payload.role !== "SUPER_ADMIN") {
      if (!targetUser.tenantId || !payload.tenantId) {
        return forbiddenResponse("Cannot delete users outside your tenant");
      }
      requireTenantAccess(payload, targetUser.tenantId);
      requireRole(payload, "SUPER_ADMIN", "ADMIN");
    }

    // Prevent deleting self
    if (payload.userId === id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const softDeleted = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    await logAudit({
      action: "DELETE",
      entity: "User",
      entityId: id,
      details: { email: targetUser.email },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({ message: "User deactivated successfully", user: softDeleted });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && (error.message.includes("Insufficient") || error.message.includes("access") || error.message.includes("Cannot"))) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
