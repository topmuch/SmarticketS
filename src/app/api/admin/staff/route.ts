import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createStaffSchema } from "@/lib/schemas/admin";
import { hashPin, generatePin, extendPinExpiry } from "@/lib/pin";

// GET /api/admin/staff — List staff members
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");

    // ─── Tenant isolation: ADMIN sees only their own tenant, SUPER_ADMIN sees all ───
    const { searchParams } = new URL(request.url);
    const tenantId = user.role === "SUPER_ADMIN"
      ? (searchParams.get("tenantId") || undefined)
      : user.tenantId;

    if (!tenantId && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const staff = await db.user.findMany({
      where: tenantId ? { tenantId } : undefined,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(staff);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/admin/staff — Create new staff member (with Zod validation)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");

    const body = await request.json();
    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const isTerrainRole = data.role === "CONTROLLER" || data.role === "DRIVER";

    // ─── Terrain staff: derive email/password if missing ───
    let resolvedEmail = data.email || "";
    let resolvedPassword = data.password || "";
    let plaintextPin: string | undefined;
    let hashedPinValue: string | undefined;
    let pinExpiry: Date | undefined;

    if (isTerrainRole) {
      // Generate placeholder email if not provided
      if (!resolvedEmail && data.phone) {
        resolvedEmail = `${data.role.toLowerCase()}_${data.phone.replace(/[^\d]/g, "")}@field.local`;
      }
      // Generate placeholder password if not provided
      if (!resolvedPassword) {
        // Generate a random 16-char placeholder password (not security-critical — terrain staff uses PIN)
        const randomBytes = new Uint8Array(16);
        globalThis.crypto.getRandomValues(randomBytes);
        resolvedPassword = Array.from(randomBytes, (b) => b.toString(36).padStart(2, "0").slice(-1)).join("");
      }
      // Hash PIN if provided
      if (data.pin && data.pin !== "") {
        plaintextPin = data.pin;
        hashedPinValue = await hashPin(data.pin);
        pinExpiry = extendPinExpiry();
      }
    } else {
      // Non-terrain: ensure we have values (schema already validates)
      resolvedEmail = data.email || "";
      resolvedPassword = data.password || "";
    }

    // ─── Tenant isolation: ADMIN creates staff only in their own tenant ───
    const tenantId = user.role === "SUPER_ADMIN"
      ? (body.tenantId as string || undefined)
      : user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Check email uniqueness within tenant
    const existingUser = await db.user.findUnique({
      where: { email_tenantId: { email: resolvedEmail, tenantId } },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(resolvedPassword);

    const staff = await db.user.create({
      data: {
        email: resolvedEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        password: hashedPassword,
        role: data.role,
        tenantId,
        isActive: true,
        ...(hashedPinValue ? { pinHash: hashedPinValue, pinExpiresAt: pinExpiry } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        action: "CREATE_STAFF",
        entity: "User",
        entityId: staff.id,
        userId: user.userId,
        tenantId,
        details: JSON.stringify({
          email: staff.email,
          role: staff.role,
          hasPin: !!hashedPinValue,
        }),
      },
    });

    // Return staff with generated PIN (plaintext, shown only at creation)
    return NextResponse.json({
      ...staff,
      ...(plaintextPin ? { generatedPin: plaintextPin } : {}),
    }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
