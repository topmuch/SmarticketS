'use client';

/**
 * RBAC Client Components — Can, PermissionProvider
 *
 * Client-side permission checking using React context.
 * Re-exports server constants for convenience.
 */

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { StaffPermission } from '@prisma/client';

// Re-export server-side constants (these are just string literals, no server deps)
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

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  OPERATOR: 'Opérateur',
  CONTROLLER: 'Contrôleur',
  DRIVER: 'Chauffeur',
};

export const PERMISSION_LABELS: Record<string, string> = {
  VIEW_REPORTS: 'Voir les rapports',
  MANAGE_STAFF: "Gérer l'équipe",
  ACTIVATE_TICKETS: 'Activer des tickets',
  ACTIVATE_PARCELS: 'Activer des colis',
  VALIDATE_TICKETS: 'Valider des tickets',
  MANAGE_DELIVERIES: 'Gérer les livraisons',
  VIEW_ANALYTICS: 'Voir les analytics',
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: Object.values(PERMISSIONS),
  OPERATOR: [PERMISSIONS.ACTIVATE_TICKETS, PERMISSIONS.ACTIVATE_PARCELS, PERMISSIONS.VIEW_ANALYTICS],
  CONTROLLER: [PERMISSIONS.VALIDATE_TICKETS],
  DRIVER: [PERMISSIONS.MANAGE_DELIVERIES],
};

// ─── Permission Helpers (client-side mirror) ───

function hasPermission(permissions: string[], required: string): boolean {
  // ADMIN shortcut
  if (
    permissions.includes(PERMISSIONS.MANAGE_STAFF) &&
    permissions.includes(PERMISSIONS.VIEW_REPORTS) &&
    permissions.includes(PERMISSIONS.VALIDATE_TICKETS) &&
    permissions.includes(PERMISSIONS.MANAGE_DELIVERIES)
  ) {
    return true;
  }
  return permissions.includes(required);
}

// ─── Context ───

interface PermissionContextValue {
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  setPermissions: () => {},
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('staff_permissions');
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return [];
  });

  return (
    <PermissionContext.Provider value={{ permissions, setPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}

// ─── Can Component ───

export function Can({
  permission,
  children,
}: {
  permission: StaffPermission;
  children: ReactNode;
}) {
  const { permissions } = useContext(PermissionContext);

  let perms = permissions;

  // Fallback: read directly from localStorage
  if (perms.length === 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('staff_permissions');
      if (raw) perms = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  if (!hasPermission(perms, permission)) return null;
  return <>{children}</>;
}
