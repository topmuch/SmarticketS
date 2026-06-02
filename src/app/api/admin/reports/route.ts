import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole } from "@/lib/auth-guard";
import { generateTenantReport } from "@/lib/reports";

// GET /api/admin/reports — Generate tenant report
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");

    const tenantId = user.tenantId;
    if (!tenantId && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      lineId: searchParams.get("lineId") || undefined,
      stationId: searchParams.get("stationId") || undefined,
      status: searchParams.get("status") || undefined,
    };

    // For SUPER_ADMIN, allow targeting a specific tenant
    const targetTenantId =
      user.role === "SUPER_ADMIN"
        ? searchParams.get("tenantId") || tenantId
        : tenantId;

    if (!targetTenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const report = await generateTenantReport(targetTenantId, filters);

    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// GET /api/admin/reports?export=csv — Export CSV
export async function HEAD(request: NextRequest) {
  return GET(request);
}
