// @ts-nocheck
import { db } from "@/lib/db";
import { forbiddenResponse, type JwtPayload } from "@/lib/auth-guard";
import type { NextResponse } from "next/server";

export type GenerationType = "ticket" | "parcel";

interface GenerationCheckResult {
  allowed: boolean;
  response?: NextResponse;
}

/**
 * Check whether the authenticated user's tenant is allowed to generate
 * tickets or parcels. SUPER_ADMIN always bypasses this check.
 */
export async function checkGenerationPermission(
  user: JwtPayload,
  type: GenerationType
): Promise<GenerationCheckResult> {
  // SUPER_ADMIN always has full generation rights
  if (user.role === "SUPER_ADMIN") {
    return { allowed: true };
  }

  // Users without a tenant cannot generate anything
  if (!user.tenantId) {
    return {
      allowed: false,
      response: forbiddenResponse(
        "Vous devez appartenir à une société pour effectuer cette action."
      ),
    };
  }

  // Fetch the tenant's generation flags from DB
  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      id: true,
      name: true,
      allowSelfTicketGeneration: true,
      allowSelfParcelGeneration: true,
      isActive: true,
    },
  });

  if (!tenant) {
    return {
      allowed: false,
      response: forbiddenResponse("Société introuvable."),
    };
  }

  if (!tenant.isActive) {
    return {
      allowed: false,
      response: forbiddenResponse(
        `La société "${tenant.name}" est désactivée. Contactez le support.`
      ),
    };
  }

  const fieldName =
    type === "ticket"
      ? "allowSelfTicketGeneration"
      : "allowSelfParcelGeneration";

  const isAllowed = tenant[fieldName];

  if (!isAllowed) {
    const label =
      type === "ticket"
        ? "générer des tickets"
        : "enregistrer des colis";
    return {
      allowed: false,
      response: forbiddenResponse(
        `Votre société n'est pas autorisée à ${label}. Contactez le Superadmin pour activer cette fonctionnalité.`
      ),
    };
  }

  return { allowed: true };
}
