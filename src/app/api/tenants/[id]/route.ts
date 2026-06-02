import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getAuthUser,
  requireRole,
  requireTenantAccess,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  logo: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
  isActive: z.boolean().optional(),
  maxUsers: z.number().int().min(1).optional(),
  maxStations: z.number().int().min(1).optional(),
  allowSelfTicketGeneration: z.boolean().optional(),
  allowSelfParcelGeneration: z.boolean().optional(),
  settings: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tenants/:id - Get single tenant
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    const { id } = await params;

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, stations: true, lines: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // SUPER_ADMIN can see any tenant, others can only see their own
    if (payload.role !== "SUPER_ADMIN") {
      requireTenantAccess(payload, id);
    }

    return NextResponse.json(tenant);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient") || error instanceof Error && error.message.includes("access")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to fetch tenant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/tenants/:id - Update tenant (SUPER_ADMIN only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "SUPER_ADMIN");
    const { id } = await params;

    const existingTenant = await db.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // If slug is being changed, check uniqueness
    if (data.slug && data.slug !== existingTenant.slug) {
      const slugExists = await db.tenant.findUnique({ where: { slug: data.slug } });
      if (slugExists) {
        return NextResponse.json(
          { error: "A tenant with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await db.tenant.update({
      where: { id },
      data,
    });

    await logAudit({
      action: "UPDATE",
      entity: "Tenant",
      entityId: id,
      details: data,
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to update tenant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/tenants/:id - Soft delete tenant (SUPER_ADMIN only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "SUPER_ADMIN");
    const { id } = await params;

    const existingTenant = await db.tenant.findUnique({ where: { id } });
    if (!existingTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const softDeleted = await db.tenant.update({
      where: { id },
      data: { isActive: false },
    });

    // Deactivate all users in the tenant
    await db.user.updateMany({
      where: { tenantId: id },
      data: { isActive: false },
    });

    await logAudit({
      action: "DELETE",
      entity: "Tenant",
      entityId: id,
      details: { name: existingTenant.name, slug: existingTenant.slug },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json({ message: "Tenant deactivated successfully", tenant: softDeleted });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to delete tenant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
