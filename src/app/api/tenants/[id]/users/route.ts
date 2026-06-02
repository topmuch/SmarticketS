// @ts-nocheck
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
import { hashPassword } from "@/lib/auth";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "OPERATOR", "CONTROLLER", "DRIVER"]).default("OPERATOR"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tenants/:id/users - List users for a tenant
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    const { id } = await params;

    // Only SUPER_ADMIN or tenant's own ADMIN can list users
    if (payload.role !== "SUPER_ADMIN") {
      requireTenantAccess(payload, id);
      requireRole(payload, "SUPER_ADMIN", "ADMIN");
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId: id };

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ];
    }
    if (roleFilter) {
      where.role = roleFilter;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
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
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && (error.message.includes("Insufficient") || error.message.includes("access"))) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/tenants/:id/users - Create user in tenant
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const payload = await getAuthUser(request);
    const { id } = await params;

    // Only SUPER_ADMIN or tenant's own ADMIN can create users
    if (payload.role !== "SUPER_ADMIN") {
      requireTenantAccess(payload, id);
      requireRole(payload, "SUPER_ADMIN", "ADMIN");
    }

    // Verify tenant exists
    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check user limit
    const userCount = await db.user.count({ where: { tenantId: id } });
    if (userCount >= tenant.maxUsers) {
      return NextResponse.json(
        { error: `User limit reached (${tenant.maxUsers}). Please upgrade your plan.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for existing email in the same tenant
    const existingUser = await db.user.findUnique({
      where: { email_tenantId: { email: data.email, tenantId: id } },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists in this tenant" },
        { status: 409 }
      );
    }

    // SUPER_ADMIN can create ADMIN, others can only create roles below their level
    if (payload.role !== "SUPER_ADMIN" && data.role === "ADMIN") {
      return NextResponse.json(
        { error: "Only SUPER_ADMIN can create ADMIN users" },
        { status: 403 }
      );
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        tenantId: id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
      },
    });

    await logAudit({
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: { email: data.email, firstName: data.firstName, lastName: data.lastName, role: data.role },
      userId: payload.userId,
      tenantId: id,
      request,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && (error.message.includes("Insufficient") || error.message.includes("access"))) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
