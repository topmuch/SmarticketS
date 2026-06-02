import { verifyToken } from "./auth";
import type { Role } from "@prisma/client";
import type { JwtPayload } from "./auth";
import { NextResponse } from "next/server";

export async function getAuthUser(request: Request): Promise<JwtPayload> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function requireRole(user: JwtPayload, ...roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new Error(
      `Insufficient permissions. Required roles: ${roles.join(", ")}`
    );
  }
}

export function requireTenantAccess(user: JwtPayload, tenantId: string): void {
  if (user.role !== "SUPER_ADMIN" && user.tenantId !== tenantId) {
    throw new Error("You do not have access to this tenant");
  }
}

export function unauthorizedResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}
