/**
 * SmartTicketQR — Server-side Auth Helper
 *
 * Centralizes JWT parsing to avoid duplication across route handlers.
 * Use this in server-side code (route handlers, server actions) instead
 * of manually parsing the Authorization header each time.
 *
 * For client-side auth, use the Zustand store (stores/auth-store.ts).
 */

import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import type { JwtPayload } from "@/lib/auth";

/**
 * Get the current authenticated user from cookies.
 * Returns null if not authenticated.
 *
 * Note: The middleware already verifies JWT for API routes,
 * so this is primarily useful for server actions and
 * Server Components that need user context.
 */
export async function getCurrentUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("st_access_token")?.value;

  if (token) {
    try {
      return await verifyToken(token);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get the current user from a Request object's Authorization header.
 * Useful in route handlers where you need both the user and the request.
 */
export async function getUserFromRequest(
  request: Request
): Promise<JwtPayload | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
