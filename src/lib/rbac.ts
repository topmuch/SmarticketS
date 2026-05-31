/**
 * RBAC — Role-Based Access Control middleware & utilities (Server-side)
 *
 * Provides granular permission checking for the Staff module.
 * Used in API routes to enforce access control before processing requests.
 *
 * Client-side components (Can, PermissionProvider) are in rbac-client.tsx
 */

import type { StaffRole, StaffPermission } from '@prisma/client';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// ─── Enum Values (defined as constants for Turbopack compatibility) ──
// Prisma enums are type-only in some bundler contexts; we define runtime values.

export const ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  CONTROLLER: 'CONTROLLER',
  DRIVER: 'DRIVER',
} as const;

export const PERMISSIONS = {
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_STAFF: 'MANAGE_STAFF',
  ACTIVATE_TICKETS: 'ACTIVATE_TICKETS',
  ACTIVATE_PARCELS: 'ACTIVATE_PARCELS',
  VALIDATE_TICKETS: 'VALIDATE_TICKETS',
  MANAGE_DELIVERIES: 'MANAGE_DELIVERIES',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
} as const;

// All permission values for validation
const ALL_PERMISSION_VALUES: string[] = Object.values(PERMISSIONS);

// ─── Default Permissions per Role ─────────────────────────────────────

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.ACTIVATE_TICKETS,
    PERMISSIONS.ACTIVATE_PARCELS,
    PERMISSIONS.VALIDATE_TICKETS,
    PERMISSIONS.MANAGE_DELIVERIES,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  [ROLES.OPERATOR]: [
    PERMISSIONS.ACTIVATE_TICKETS,
    PERMISSIONS.ACTIVATE_PARCELS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  [ROLES.CONTROLLER]: [
    PERMISSIONS.VALIDATE_TICKETS,
  ],
  [ROLES.DRIVER]: [
    PERMISSIONS.MANAGE_DELIVERIES,
  ],
};

/** Backward-compatible alias */
export const DEFAULT_PERMISSIONS = ROLE_PERMISSIONS;

// ─── JWT Configuration ──────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'smartickets-field-secret-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'smartickets-staff-refresh-secret';

export interface StaffJwtPayload {
  staffId: string;
  role: string;
  agencyId: string;
  permissions: string[];
}

// ─── JWT Utilities ──────────────────────────────────────────────────

export function generateStaffAccessToken(payload: StaffJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function generateStaffRefreshToken(staffId: string): string {
  return jwt.sign({ staffId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyStaffAccessToken(token: string): StaffJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as StaffJwtPayload;
  } catch {
    return null;
  }
}

export function verifyStaffRefreshToken(token: string): { staffId: string } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { staffId: string };
  } catch {
    return null;
  }
}

// ─── Permission Helpers ──────────────────────────────────────────────

export function getPermissionsForRole(role: StaffRole): StaffPermission[] {
  return (ROLE_PERMISSIONS[role] ?? []) as StaffPermission[];
}

export function hasPermission(
  userPermissions: string[],
  requiredPermission: StaffPermission | string
): boolean {
  // ADMIN has all permissions
  if (
    userPermissions.includes(PERMISSIONS.MANAGE_STAFF) &&
    userPermissions.includes(PERMISSIONS.VIEW_REPORTS) &&
    userPermissions.includes(PERMISSIONS.VALIDATE_TICKETS) &&
    userPermissions.includes(PERMISSIONS.MANAGE_DELIVERIES)
  ) {
    return true;
  }
  return userPermissions.includes(requiredPermission);
}

export function hasAllPermissions(
  permissions: string[],
  required: string[]
): boolean {
  return required.every((p) => hasPermission(permissions, p));
}

export function hasAnyPermission(
  permissions: string[],
  required: string[]
): boolean {
  return required.some((p) => hasPermission(permissions, p));
}

// ─── API Route Middleware ────────────────────────────────────────────

export function verifyStaffRequest(
  req: NextRequest,
  requiredPermission?: string
): {
  valid: true;
  payload: StaffJwtPayload;
} | {
  valid: false;
  error: string;
  status: number;
} {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Token manquant', status: 401 };
  }

  const token = authHeader.substring(7);
  const payload = verifyStaffAccessToken(token);
  if (!payload) {
    return { valid: false, error: 'Token invalide ou expiré', status: 401 };
  }

  if (requiredPermission && !hasPermission(payload.permissions, requiredPermission)) {
    return { valid: false, error: 'Accès refusé — permission insuffisante', status: 403 };
  }

  return { valid: true, payload };
}

export function requirePermission(permission: StaffPermission) {
  return (req: NextRequest): Response | null => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyStaffAccessToken(token);
    if (!payload) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!hasPermission(payload.permissions, permission)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return null;
  };
}

// ─── Parse Permissions (JSON ↔ Array) ──────────────────────────────

export function parsePermissions(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p): p is string =>
      typeof p === 'string' && ALL_PERMISSION_VALUES.includes(p)
    );
  } catch {
    return [];
  }
}

export function serializePermissions(perms: string[]): string {
  return JSON.stringify(perms);
}

// ─── Role Label Helpers ─────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.OPERATOR]: 'Opérateur',
  [ROLES.CONTROLLER]: 'Contrôleur',
  [ROLES.DRIVER]: 'Chauffeur',
};

export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.VIEW_REPORTS]: 'Voir les rapports',
  [PERMISSIONS.MANAGE_STAFF]: "Gérer l'équipe",
  [PERMISSIONS.ACTIVATE_TICKETS]: 'Activer des tickets',
  [PERMISSIONS.ACTIVATE_PARCELS]: 'Activer des colis',
  [PERMISSIONS.VALIDATE_TICKETS]: 'Valider des tickets',
  [PERMISSIONS.MANAGE_DELIVERIES]: 'Gérer les livraisons',
  [PERMISSIONS.VIEW_ANALYTICS]: 'Voir les analytics',
};
