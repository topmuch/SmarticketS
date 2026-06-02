import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateToken, generateRefreshToken, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const loginPhoneSchema = z.object({
  phone: z
    .string()
    .min(8, "Le numéro de téléphone est trop court")
    .max(20, "Le numéro de téléphone est trop long"),
  password: z.string().min(1, "Le code d'accès est requis"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginPhoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { phone, password } = parsed.data;

    // Normalize phone: remove spaces, dashes, parentheses, leading +
    const normalizedPhone = phone.replace(/[\s\-()+]/g, "");

    // Look up user by phone number (normalized match using LIKE)
    const user = await db.user.findFirst({
      where: {
        AND: [
          {
            OR: [
              { phone: normalizedPhone },
              { phone: { contains: normalizedPhone.slice(-9) } }, // match last 9 digits
            ],
          },
          { isActive: true },
        ],
      },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Numéro ou code d'accès incorrect" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Compte désactivé. Contactez votre administrateur." },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Numéro ou code d'accès incorrect" },
        { status: 401 }
      );
    }

    // Update lastLogin
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const { token: accessToken } = await generateToken(payload);
    const { token: refreshToken } = await generateRefreshToken(payload);

    // Log audit entry
    await logAudit({
      action: "LOGIN_PHONE",
      entity: "User",
      entityId: user.id,
      userId: user.id,
      tenantId: user.tenantId,
      request,
      details: JSON.stringify({ method: "phone" }),
    });

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        tenantId: user.tenantId,
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              name: user.tenant.name,
              slug: user.tenant.slug,
              plan: user.tenant.plan,
              allowSelfTicketGeneration: user.tenant.allowSelfTicketGeneration,
              allowSelfParcelGeneration: user.tenant.allowSelfParcelGeneration,
            }
          : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
