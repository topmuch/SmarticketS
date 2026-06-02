/**
 * SmartTicketQR — RBAC Guard for Terrain APIs
 *
 * Lightweight role-checking guard for PWA terrain endpoints (CONTROLLER, DRIVER).
 * Extracts Bearer token, verifies JWT, checks role against allowedRoles.
 *
 * Usage:
 *   const payload = await requireFieldAccess(request, ["DRIVER", "CONTROLLER"]);
 *   if (payload instanceof NextResponse) return payload; // 401 or 403
 *   // payload is JwtPayload — proceed with request
 */

import { NextResponse } from "next/server";
import { verifyToken } from "./auth";
import type { Role } from "@prisma/client";
import type { JwtPayload } from "./auth";

/**
 * Verify Bearer token and check role access for terrain APIs.
 *
 * @param request - The incoming request
 * @param allowedRoles - Array of roles permitted to access this endpoint
 * @returns JwtPayload on success, or a NextResponse error (401/403)
 */
export async function requireFieldAccess(
  request: Request,
  allowedRoles: Role[]
): Promise<JwtPayload | NextResponse> {
  // ─── Extract Bearer token ───
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentification requise. Fournissez un token Bearer valide." },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  // ─── Verify JWT ───
  let payload: JwtPayload;
  try {
    payload = await verifyToken(token);
  } catch {
    return NextResponse.json(
      { error: "Token invalide ou expiré" },
      { status: 401 }
    );
  }

  // ─── Check role ───
  if (!allowedRoles.includes(payload.role)) {
    return NextResponse.json(
      { error: "Accès refusé. Rôle insuffisant." },
      { status: 403 }
    );
  }

  return payload;
}
