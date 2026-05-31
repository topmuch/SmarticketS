/**
 * Field Login API — /api/auth/field-login
 *
 * POST → Authenticate a staff member with phone + login code.
 *       Returns short-lived access token (15m) + long-lived refresh token (30d).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateStaffAccessToken,
  generateStaffRefreshToken,
  parsePermissions,
} from '@/lib/rbac';
import { cleanPhone } from '@/lib/wame';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// ─── Rate Limiting (in-memory) ──────────────────────────────────────

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(phone: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = loginAttempts.get(phone);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(phone, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

// ─── Validation Schema ──────────────────────────────────────────────

const loginSchema = z.object({
  phone: z.string().min(1, 'Le téléphone est requis'),
  code: z.string().regex(/^\d{4,6}$/, 'Le code doit contenir entre 4 et 6 chiffres'),
});

// ─── POST: Field Login ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { phone: rawPhone, code } = parsed.data;
    const phone = cleanPhone(rawPhone);

    // Rate limit check
    const rateCheck = checkRateLimit(phone);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
        { status: 429 }
      );
    }

    // Find staff by phone (must be active)
    const staff = await db.staff.findUnique({
      where: { phone },
      include: { agency: { select: { id: true, name: true, slug: true } } },
    });

    if (!staff || !staff.isActive) {
      if (staff) {
        await db.staffAuditLog.create({
          data: {
            action: 'STAFF_LOGIN_FAILURE',
            staffId: staff.id,
            details: JSON.stringify({ phone, reason: 'inactive' }),
          },
        });
      }
      return NextResponse.json(
        { success: false, error: 'Compte inexistant ou désactivé' },
        { status: 401 }
      );
    }

    // Check code expiration
    if (staff.codeExpiresAt && new Date(staff.codeExpiresAt) < new Date()) {
      await db.staffAuditLog.create({
        data: {
          action: 'STAFF_LOGIN_FAILURE',
          staffId: staff.id,
          details: JSON.stringify({ phone, reason: 'code_expired' }),
        },
      });
      return NextResponse.json(
        { success: false, error: 'Code expiré. Demandez un nouveau code.' },
        { status: 401 }
      );
    }

    // Verify code with bcrypt.compare
    if (!staff.loginCodeHash || !(await bcrypt.compare(code, staff.loginCodeHash))) {
      await db.staffAuditLog.create({
        data: {
          action: 'STAFF_LOGIN_FAILURE',
          staffId: staff.id,
          details: JSON.stringify({ phone, reason: 'invalid_code' }),
        },
      });
      return NextResponse.json(
        { success: false, error: 'Code incorrect' },
        { status: 401 }
      );
    }

    // ─── Login Successful ───
    const permissions = parsePermissions(staff.permissions);

    const accessToken = generateStaffAccessToken({
      staffId: staff.id,
      role: staff.role,
      agencyId: staff.agencyId,
      permissions,
    });

    const refreshToken = generateStaffRefreshToken(staff.id);

    // Update staff
    await db.staff.update({
      where: { id: staff.id },
      data: {
        hasActivated: true,
        lastLogin: new Date(),
      },
    });

    // Audit log
    await db.staffAuditLog.create({
      data: {
        action: 'STAFF_LOGIN_SUCCESS',
        staffId: staff.id,
        details: JSON.stringify({ phone, role: staff.role }),
      },
    });

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        agencyId: staff.agencyId,
      },
    });
  } catch (error) {
    console.error('[Field Login POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
