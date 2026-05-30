/**
 * Field Login API — /api/auth/field-login
 *
 * POST → Authenticate a staff member with phone + login code.
 *       Returns short-lived access token (15m) + long-lived refresh token (30d).
 *
 * Rate-limited: max 5 attempts per phone per 15 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCode } from '@/lib/secure-code';
import {
  generateStaffAccessToken,
  generateStaffRefreshToken,
  parsePermissions,
} from '@/lib/rbac';
import { normalizePhone } from '@/lib/whatsapp';
import { AuditAction } from '@prisma/client';
import { z } from 'zod';
import { headers } from 'next/headers';

// ─── Rate Limiting (in-memory) ──────────────────────────────────────

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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
  code: z.string().length(4, 'Le code doit contenir 4 chiffres'),
});

// ─── POST: Field Login ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Parse and validate
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { phone: rawPhone, code } = parsed.data;

    // Normalize phone
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 });
    }

    // Rate limit check
    const rateCheck = checkRateLimit(phone);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
        { status: 429 }
      );
    }

    // Find staff by phone
    const staff = await db.staff.findUnique({
      where: { phone },
      include: { agency: { select: { id: true, name: true, slug: true } } },
    });

    if (!staff || !staff.isActive) {
      // Log failed attempt
      await db.staffAuditLog.create({
        data: {
          action: AuditAction.STAFF_LOGIN_FAILURE,
          staffId: staff?.id || 'unknown',
          details: JSON.stringify({ phone, reason: staff ? 'inactive' : 'not_found' }),
        },
      });

      return NextResponse.json(
        { error: 'Compte inexistant ou désactivé', remaining: rateCheck.remaining },
        { status: 401 }
      );
    }

    // Check code expiration
    if (staff.codeExpiresAt && new Date(staff.codeExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Code expiré. Demandez un nouveau code à votre administrateur.' },
        { status: 401 }
      );
    }

    // Verify code hash
    if (!staff.loginCodeHash || !verifyCode(code, staff.loginCodeHash)) {
      // Log failed attempt
      await db.staffAuditLog.create({
        data: {
          action: AuditAction.STAFF_LOGIN_FAILURE,
          staffId: staff.id,
          details: JSON.stringify({ phone, reason: 'invalid_code' }),
        },
      });

      return NextResponse.json(
        { error: 'Code incorrect', remaining: rateCheck.remaining },
        { status: 401 }
      );
    }

    // ─── Login Successful ───

    // Generate tokens
    const permissions = parsePermissions(staff.permissions);
    const accessToken = generateStaffAccessToken({
      staffId: staff.id,
      role: staff.role,
      agencyId: staff.agencyId,
      permissions,
    });
    const refreshToken = generateStaffRefreshToken(staff.id);

    // Update staff: set hasActivated, update lastLogin
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
        action: AuditAction.STAFF_LOGIN_SUCCESS,
        staffId: staff.id,
        details: JSON.stringify({ phone, role: staff.role }),
      },
    });

    // Return tokens + staff info
    return NextResponse.json({
      accessToken,
      refreshToken,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        permissions,
        agency: {
          id: staff.agency.id,
          name: staff.agency.name,
          slug: staff.agency.slug,
        },
      },
    });
  } catch (error) {
    console.error('[Field Login POST] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
