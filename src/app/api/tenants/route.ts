// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser, requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";

const createTenantSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be a valid URL-friendly string (lowercase, dashes only)"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["free", "starter", "pro", "enterprise"]).default("free"),
  maxUsers: z.number().int().min(1).default(10),
  maxStations: z.number().int().min(1).default(5),
});

// GET /api/tenants - List all tenants (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "SUPER_ADMIN");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { slug: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { users: true },
          },
        },
      }),
      db.tenant.count({ where }),
    ]);

    return NextResponse.json({
      data: tenants,
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
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to fetch tenants";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/tenants - Create tenant (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    requireRole(payload, "SUPER_ADMIN");

    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if slug is already taken
    const existingSlug = await db.tenant.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      return NextResponse.json(
        { error: "A tenant with this slug already exists" },
        { status: 409 }
      );
    }

    const tenant = await db.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone: data.phone,
        address: data.address,
        plan: data.plan,
        maxUsers: data.maxUsers,
        maxStations: data.maxStations,
      },
    });

    await logAudit({
      action: "CREATE",
      entity: "Tenant",
      entityId: tenant.id,
      details: { name: data.name, slug: data.slug },
      userId: payload.userId,
      tenantId: payload.tenantId,
      request,
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Failed to create tenant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
